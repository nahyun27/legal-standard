"""관리자(백오피스) API.

권한: 회원·권한 관리 = 관리자(is_admin) / 사건 처리 = 직원(관리자 또는 변호사) / 검수 완료 = 변호사(is_lawyer)만.
모든 조치와 개인정보 열람은 audit_logs 에 남긴다(개인정보 접속기록 보관, 기획서 "처리 로그 전량 문서화").
"""

from datetime import timedelta
from math import ceil

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.cases import file_dict
from app.core import storage, toss
from app.core.audit import record
from app.core.catalog import get_product
from app.core.database import get_db
from app.core.deps import get_admin_user, get_current_user
from app.core.notify import notify
from app.core.timeutil import add_business_days, aware, now
from app.models.audit import AuditLog
from app.models.case import OPEN_STATUSES, STATUS_LABEL, Case, CaseFile, CaseStatus, Payment
from app.models.user import User
from app.schemas.case import AcceptIn, ApproveIn, DeliverIn, NoteIn, ReasonIn, RolesIn

router = APIRouter(prefix="/admin", tags=["admin"])

PAGE_SIZE = 20


def get_staff_user(user: User = Depends(get_current_user)) -> User:
    if not user.is_staff:
        raise HTTPException(status.HTTP_404_NOT_FOUND)  # 관리자 화면의 존재를 알리지 않는다
    return user


def page_meta(total: int, page: int) -> dict:
    return {"total": total, "page": page, "pages": max(1, ceil(total / PAGE_SIZE)), "size": PAGE_SIZE}


def mask_phone(p: str | None) -> str | None:
    return f"{p[:3]}-****-{p[-4:]}" if p and len(p) >= 10 else p


# ---------- 내 권한 · 대시보드 -------------------------------------------------


@router.get("/me")
def admin_me(user: User = Depends(get_staff_user)) -> dict:
    return {"id": user.id, "name": user.name, "is_admin": user.is_admin, "is_lawyer": user.is_lawyer}


@router.get("/stats")
def stats(_: User = Depends(get_staff_user), db: Session = Depends(get_db)) -> dict:
    t = now()
    today = t.replace(hour=0, minute=0, second=0, microsecond=0)
    week = t - timedelta(days=7)
    users = select(func.count(User.id)).where(User.withdrawn_at.is_(None))
    by_status = dict(db.execute(select(Case.status, func.count(Case.id)).group_by(Case.status)).all())
    paid = select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.status == "done")
    return {
        "users": {
            "total": db.scalar(users) or 0,
            "onboarded": db.scalar(users.where(User.onboarded_at.is_not(None))) or 0,
            "new_7d": db.scalar(users.where(User.created_at >= week)) or 0,
            "marketing": db.scalar(users.where(User.marketing_consent.is_(True))) or 0,
            "by_provider": dict(db.execute(select(User.social_provider, func.count(User.id)).where(User.withdrawn_at.is_(None)).group_by(User.social_provider)).all()),
        },
        "cases": {
            "by_status": {s.value: by_status.get(s.value, 0) for s in CaseStatus},
            "open": sum(by_status.get(s.value, 0) for s in OPEN_STATUSES),
            "overdue": db.scalar(select(func.count(Case.id)).where(Case.status.in_([s.value for s in OPEN_STATUSES]), Case.due_at < t)) or 0,
            "paid_today": db.scalar(select(func.count(Case.id)).where(Case.paid_at >= today)) or 0,
        },
        "revenue": {
            "today": db.scalar(paid.where(Payment.approved_at >= today)) or 0,
            "d7": db.scalar(paid.where(Payment.approved_at >= week)) or 0,
            "total": db.scalar(paid) or 0,
        },
        "status_labels": {s.value: STATUS_LABEL[s] for s in CaseStatus},
    }


# ---------- 회원 -------------------------------------------------------------


def user_row(u: User) -> dict:
    return {
        "id": u.id, "name": u.name, "phone": mask_phone(u.phone), "email": u.email, "social_provider": u.social_provider,
        "status": u.status, "is_admin": u.is_admin, "is_lawyer": u.is_lawyer,
        "created_at": u.created_at, "last_login_at": u.last_login_at,
    }


@router.get("/users")
def list_users(
    q: str | None = None,
    status_: str | None = Query(default=None, alias="status"),
    role: str | None = None,
    page: int = Query(default=1, ge=1),
    _: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> dict:
    stmt = select(User)
    if q:
        like = f"%{q.strip()}%"
        digits = "".join(ch for ch in q if ch.isdigit())
        conds = [User.name.ilike(like), User.email.ilike(like)]
        if digits:
            conds.append(User.phone.like(f"%{digits}%"))
        if q.strip().isdigit():
            conds.append(User.id == int(q.strip()))
        stmt = stmt.where(or_(*conds))
    if status_ == "active":
        stmt = stmt.where(User.onboarded_at.is_not(None), User.is_active.is_(True))
    elif status_ == "pending":
        stmt = stmt.where(User.onboarded_at.is_(None), User.is_active.is_(True))
    elif status_ == "suspended":
        stmt = stmt.where(User.suspended_at.is_not(None))
    elif status_ == "withdrawn":
        stmt = stmt.where(User.withdrawn_at.is_not(None))
    if role == "staff":
        stmt = stmt.where(or_(User.is_admin.is_(True), User.is_lawyer.is_(True)))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(User.id.desc()).offset((page - 1) * PAGE_SIZE).limit(PAGE_SIZE)).all()
    return {"items": [user_row(u) for u in rows], **page_meta(total, page)}


@router.get("/users/{user_id}")
def user_detail(user_id: int, request: Request, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)) -> dict:
    u = db.get(User, user_id)
    if u is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="회원을 찾을 수 없습니다.")
    # 전체 연락처 등 개인정보를 보는 행위 자체를 기록한다
    record(db, "user.view", actor_id=admin.id, target_type="user", target_id=u.id, request=request)
    db.commit()
    cases = db.scalars(select(Case).where(Case.user_id == u.id).order_by(Case.id.desc())).all()
    return {
        **user_row(u), "phone": u.phone,
        "terms_agreed_at": u.terms_agreed_at, "privacy_agreed_at": u.privacy_agreed_at,
        "marketing_consent": u.marketing_consent, "marketing_consent_at": u.marketing_consent_at,
        "onboarded_at": u.onboarded_at, "suspended_at": u.suspended_at, "withdrawn_at": u.withdrawn_at,
        "cases": [case_row(c, db) for c in cases],
        "logs": logs_for(db, "user", u.id),
    }


@router.post("/users/{user_id}/suspend")
def suspend(user_id: int, payload: ReasonIn, request: Request, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)) -> dict:
    u = db.get(User, user_id)
    if u is None or u.withdrawn_at:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="정지할 수 있는 회원이 아닙니다.")
    if u.id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="본인 계정은 정지할 수 없습니다.")
    u.is_active, u.suspended_at = False, now()
    u.token_version += 1  # 로그인 중인 세션도 즉시 끊는다
    record(db, "user.suspend", actor_id=admin.id, target_type="user", target_id=u.id, reason=payload.reason, request=request)
    db.commit()
    return user_row(u)


@router.post("/users/{user_id}/unsuspend")
def unsuspend(user_id: int, payload: ReasonIn, request: Request, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)) -> dict:
    u = db.get(User, user_id)
    if u is None or u.withdrawn_at or not u.suspended_at:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="정지된 회원이 아닙니다.")
    u.is_active, u.suspended_at = True, None
    record(db, "user.unsuspend", actor_id=admin.id, target_type="user", target_id=u.id, reason=payload.reason, request=request)
    db.commit()
    return user_row(u)


@router.post("/users/{user_id}/roles")
def set_roles(user_id: int, payload: RolesIn, request: Request, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)) -> dict:
    u = db.get(User, user_id)
    if u is None or not u.is_active:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="권한을 줄 수 있는 회원이 아닙니다.")
    if u.id == admin.id and payload.is_admin is False:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="본인의 관리자 권한은 해제할 수 없습니다(다른 관리자가 해야 합니다).")
    if not u.is_onboarded:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="가입을 마친(실명 확인된) 회원에게만 권한을 줄 수 있습니다.")
    before = {"is_admin": u.is_admin, "is_lawyer": u.is_lawyer}
    if payload.is_admin is not None:
        u.is_admin = payload.is_admin
    if payload.is_lawyer is not None:
        u.is_lawyer = payload.is_lawyer
    record(db, "user.roles", actor_id=admin.id, target_type="user", target_id=u.id, reason=payload.reason,
           detail={"before": before, "after": {"is_admin": u.is_admin, "is_lawyer": u.is_lawyer}}, request=request)
    db.commit()
    return user_row(u)


# ---------- 사건 -------------------------------------------------------------


def case_row(c: Case, db: Session) -> dict:
    client = db.get(User, c.user_id)
    lawyer = db.get(User, c.lawyer_id) if c.lawyer_id else None
    return {
        "id": c.id, "case_no": c.case_no, "service_slug": c.service_slug, "service_name": c.service_name,
        "status": c.status, "status_label": c.status_label, "client_name": (c.intake or {}).get("client_name") or (client.name if client else None),
        "opponent_name": c.opponent_name, "total": c.total, "lawyer_name": lawyer.name if lawyer else None,
        "created_at": c.created_at, "paid_at": c.paid_at, "due_at": c.due_at,
        "overdue": bool(c.due_at and c.status in [s.value for s in OPEN_STATUSES] and aware(c.due_at) < now()),
    }


def find_conflicts(db: Session, c: Case) -> list[dict]:
    """이해충돌 후보. 이름 일치는 동명이인일 수 있으니 '후보'로만 보여주고 판단은 변호사가 한다."""
    out: list[dict] = []
    client_name = (c.intake or {}).get("client_name")
    if c.opponent_name:
        same_opp = db.scalars(select(Case).where(Case.id != c.id, func.lower(Case.opponent_name) == c.opponent_name.lower(), Case.status != CaseStatus.CANCELED)).all()
        out += [{"kind": "같은 상대방의 다른 사건", "case_id": x.id, "case_no": x.case_no, "name": x.opponent_name} for x in same_opp]
        members = db.scalars(select(User).where(func.lower(User.name) == c.opponent_name.lower(), User.id != c.user_id)).all()
        out += [{"kind": "상대방과 이름이 같은 회원", "user_id": u.id, "name": u.name} for u in members]
    if client_name:
        reverse = db.scalars(select(Case).where(Case.id != c.id, func.lower(Case.opponent_name) == client_name.lower(), Case.status != CaseStatus.CANCELED)).all()
        out += [{"kind": "이 의뢰인이 상대방인 다른 사건", "case_id": x.id, "case_no": x.case_no, "name": x.opponent_name} for x in reverse]
    return out


def logs_for(db: Session, target_type: str, target_id: int) -> list[dict]:
    rows = db.execute(
        select(AuditLog, User.name).outerjoin(User, User.id == AuditLog.actor_id)
        .where(AuditLog.target_type == target_type, AuditLog.target_id == target_id).order_by(AuditLog.id.desc()).limit(200)
    ).all()
    return [{"id": a.id, "action": a.action, "actor_name": n, "reason": a.reason, "detail": a.detail, "created_at": a.created_at} for a, n in rows]


def staff_case(db: Session, case_id: int) -> Case:
    c = db.get(Case, case_id)
    if c is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="사건을 찾을 수 없습니다.")
    return c


def require(c: Case, *allowed: CaseStatus) -> None:
    if c.status not in [s.value for s in allowed]:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=f"현재 상태({c.status_label})에서는 할 수 없는 작업입니다.")


@router.get("/cases")
def list_cases(
    q: str | None = None,
    status_: str | None = Query(default=None, alias="status"),
    mine: bool = False,
    page: int = Query(default=1, ge=1),
    staff: User = Depends(get_staff_user),
    db: Session = Depends(get_db),
) -> dict:
    stmt = select(Case).where(Case.status != CaseStatus.CANCELED)
    if status_ == "open":
        stmt = stmt.where(Case.status.in_([s.value for s in OPEN_STATUSES]))
    elif status_:
        stmt = stmt.where(Case.status == status_)
    if mine:
        stmt = stmt.where(Case.lawyer_id == staff.id)
    if q:
        like = f"%{q.strip()}%"
        digits = "".join(ch for ch in q if ch.isdigit())
        conds = [Case.opponent_name.ilike(like), Case.service_name.ilike(like)]
        if digits:
            # 사건번호 LS261023-00012 의 뒤 숫자로 찾기
            conds.append(Case.id == int(digits[-5:]))
        stmt = stmt.where(or_(*conds))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    # 마감이 급한 순서 → 최신순
    rows = db.scalars(stmt.order_by(Case.due_at.is_(None), Case.due_at, Case.id.desc()).offset((page - 1) * PAGE_SIZE).limit(PAGE_SIZE)).all()
    return {"items": [case_row(c, db) for c in rows], **page_meta(total, page)}


@router.get("/cases/{case_id}")
def case_detail(case_id: int, request: Request, staff: User = Depends(get_staff_user), db: Session = Depends(get_db)) -> dict:
    c = staff_case(db, case_id)
    record(db, "case.view", actor_id=staff.id, target_type="case", target_id=c.id, request=request)
    db.commit()
    client = db.get(User, c.user_id)
    reviewer = db.get(User, c.reviewer_id) if c.reviewer_id else None
    product = get_product(c.service_slug)
    return {
        **case_row(c, db),
        "intake": c.intake, "claim_amount": c.claim_amount, "fee": c.fee, "vat": c.vat, "costs": c.costs, "source": c.source,
        "client": {"id": client.id, "name": client.name, "phone": client.phone, "email": client.email} if client else None,
        "lawyer_id": c.lawyer_id, "reviewer_name": reviewer.name if reviewer else None,
        "approved_file_id": c.approved_file_id, "review_checklist": c.review_checklist,
        "checklist": list(product.checklist) if product else [],
        "reject_reason": c.reject_reason, "delivery_note": c.delivery_note,
        "accepted_at": c.accepted_at, "submitted_at": c.submitted_at, "approved_at": c.approved_at,
        "delivered_at": c.delivered_at, "rejected_at": c.rejected_at,
        "files": [{**file_dict(f), "sha256": f.sha256} for f in c.files],
        "payments": [{"id": p.id, "order_id": p.order_id, "amount": p.amount, "status": p.status, "method": p.method, "simulated": p.simulated,
                      "approved_at": p.approved_at, "canceled_at": p.canceled_at, "cancel_reason": p.cancel_reason} for p in c.payments],
        "conflicts": find_conflicts(db, c),
        "logs": logs_for(db, "case", c.id),
    }


@router.get("/lawyers")
def lawyers(_: User = Depends(get_staff_user), db: Session = Depends(get_db)) -> list[dict]:
    rows = db.scalars(select(User).where(User.is_lawyer.is_(True), User.is_active.is_(True)).order_by(User.name)).all()
    load = dict(db.execute(select(Case.lawyer_id, func.count(Case.id)).where(Case.status.in_([s.value for s in OPEN_STATUSES])).group_by(Case.lawyer_id)).all())
    return [{"id": u.id, "name": u.name, "open_cases": load.get(u.id, 0)} for u in rows]


@router.post("/cases/{case_id}/accept")
def accept(case_id: int, payload: AcceptIn, request: Request, staff: User = Depends(get_staff_user), db: Session = Depends(get_db)) -> dict:
    """수임 확정 — 담당 변호사 배정 + 표준 납기 설정. 수임 판단은 변호사가 한다(기획서 IX 원칙 2)."""
    c = staff_case(db, case_id)
    require(c, CaseStatus.REVIEWING)
    if not staff.is_lawyer:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="수임 확정은 변호사만 할 수 있습니다.")
    lawyer = db.get(User, payload.lawyer_id)
    if lawyer is None or not lawyer.is_lawyer or not lawyer.is_active:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="담당 변호사를 선택해 주세요.")
    product = get_product(c.service_slug)
    c.status, c.lawyer_id, c.accepted_at = CaseStatus.IN_PROGRESS, lawyer.id, now()
    c.due_at = add_business_days(c.accepted_at, product.turnaround_days if product else 5)
    record(db, "case.accept", actor_id=staff.id, target_type="case", target_id=c.id,
           detail={"lawyer_id": lawyer.id, "conflicts_shown": len(find_conflicts(db, c)), "due_at": c.due_at.isoformat()}, request=request)
    db.commit()
    notify(db.get(User, c.user_id), "accepted", c)
    return case_row(c, db)


@router.post("/cases/{case_id}/reject")
def reject(case_id: int, payload: ReasonIn, request: Request, staff: User = Depends(get_staff_user), db: Session = Depends(get_db)) -> dict:
    """수임 불성립 → 전액 환불(기획서 VII "수임 불성립 시 전액 반환 원칙")."""
    c = staff_case(db, case_id)
    require(c, CaseStatus.REVIEWING)
    if not staff.is_lawyer:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="수임 불성립 판단은 변호사만 할 수 있습니다.")
    for p in c.payments:
        if p.status != "done":
            continue
        if not p.simulated:
            p.raw = {**(p.raw or {}), "cancel": toss.cancel(p.payment_key or "", f"수임 불성립: {payload.reason}")}
        p.status, p.canceled_at, p.cancel_reason = "canceled", now(), payload.reason
    c.status, c.rejected_at, c.reject_reason = CaseStatus.REJECTED, now(), payload.reason
    record(db, "case.reject", actor_id=staff.id, target_type="case", target_id=c.id, reason=payload.reason, request=request)
    db.commit()
    notify(db.get(User, c.user_id), "rejected", c)
    return case_row(c, db)


@router.post("/cases/{case_id}/files")
def upload_document(
    case_id: int, request: Request, kind: str = Form("document"), file: UploadFile = File(...),
    staff: User = Depends(get_staff_user), db: Session = Depends(get_db),
) -> dict:
    c = staff_case(db, case_id)
    if kind not in ("document", "evidence"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="파일 종류가 올바르지 않습니다.")
    if kind == "document":
        # 서면은 준비 단계에서만 바꿀 수 있다 — 검수 이후에 파일을 바꿔치기할 수 없게
        require(c, CaseStatus.IN_PROGRESS)
    stored, size, digest = storage.save(file)
    f = CaseFile(case_id=c.id, kind=kind, filename=(file.filename or "file")[:255], stored_name=stored, content_type=file.content_type, size=size, sha256=digest, uploaded_by=staff.id)
    db.add(f)
    db.flush()
    record(db, "file.upload", actor_id=staff.id, target_type="case", target_id=c.id, detail={"file_id": f.id, "kind": kind, "filename": f.filename, "sha256": digest}, request=request)
    db.commit()
    return file_dict(f)


@router.post("/cases/{case_id}/submit-review")
def submit_review(case_id: int, request: Request, staff: User = Depends(get_staff_user), db: Session = Depends(get_db)) -> dict:
    c = staff_case(db, case_id)
    require(c, CaseStatus.IN_PROGRESS)
    if not any(f.kind == "document" for f in c.files):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="검수 요청 전에 서면 파일을 올려 주세요.")
    c.status, c.submitted_at = CaseStatus.LAWYER_REVIEW, now()
    record(db, "case.submit_review", actor_id=staff.id, target_type="case", target_id=c.id, request=request)
    db.commit()
    return case_row(c, db)


@router.post("/cases/{case_id}/approve")
def approve(case_id: int, payload: ApproveIn, request: Request, staff: User = Depends(get_staff_user), db: Session = Depends(get_db)) -> dict:
    """검수 완료 — 변호사만, 체크리스트 전 항목 확인 필수. 승인한 서면(최신본)을 고정한다."""
    c = staff_case(db, case_id)
    require(c, CaseStatus.LAWYER_REVIEW)
    if not staff.is_lawyer:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="검수 완료는 변호사만 할 수 있습니다.")
    product = get_product(c.service_slug)
    required = set(product.checklist if product else ())
    if not required.issubset(set(payload.checklist)):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="검수 체크리스트를 모두 확인해 주세요.")
    doc = max((f for f in c.files if f.kind == "document"), key=lambda f: f.id)
    elapsed = int((now() - aware(c.submitted_at)).total_seconds()) if c.submitted_at else None
    c.status, c.reviewer_id, c.approved_at, c.approved_file_id, c.review_checklist = CaseStatus.APPROVED, staff.id, now(), doc.id, sorted(required)
    record(db, "case.approve", actor_id=staff.id, target_type="case", target_id=c.id,
           detail={"file_id": doc.id, "sha256": doc.sha256, "wait_seconds": elapsed}, request=request)
    db.commit()
    return case_row(c, db)


@router.post("/cases/{case_id}/send-back")
def send_back(case_id: int, payload: ReasonIn, request: Request, staff: User = Depends(get_staff_user), db: Session = Depends(get_db)) -> dict:
    """검수 반려 — 반려 사유는 템플릿·문진 개선 데이터가 된다."""
    c = staff_case(db, case_id)
    require(c, CaseStatus.LAWYER_REVIEW)
    if not staff.is_lawyer:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="검수 반려는 변호사만 할 수 있습니다.")
    c.status = CaseStatus.IN_PROGRESS
    record(db, "case.send_back", actor_id=staff.id, target_type="case", target_id=c.id, reason=payload.reason, request=request)
    db.commit()
    return case_row(c, db)


@router.post("/cases/{case_id}/deliver")
def deliver(case_id: int, payload: DeliverIn, request: Request, staff: User = Depends(get_staff_user), db: Session = Depends(get_db)) -> dict:
    c = staff_case(db, case_id)
    require(c, CaseStatus.APPROVED)
    if not c.approved_file_id:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="검수 승인된 서면이 없습니다.")
    c.status, c.delivered_at, c.delivery_note = CaseStatus.DELIVERED, now(), payload.note
    record(db, "case.deliver", actor_id=staff.id, target_type="case", target_id=c.id, reason=payload.note, request=request)
    db.commit()
    notify(db.get(User, c.user_id), "delivered", c)
    return case_row(c, db)


@router.post("/cases/{case_id}/notes")
def add_note(case_id: int, payload: NoteIn, request: Request, staff: User = Depends(get_staff_user), db: Session = Depends(get_db)) -> dict:
    c = staff_case(db, case_id)
    record(db, "case.note", actor_id=staff.id, target_type="case", target_id=c.id, reason=payload.text, request=request)
    db.commit()
    return {"status": "ok"}


# ---------- 감사 로그 ---------------------------------------------------------


@router.get("/audit-logs")
def audit_logs(
    action: str | None = None,
    page: int = Query(default=1, ge=1),
    _: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> dict:
    stmt = select(AuditLog)
    if action:
        stmt = stmt.where(AuditLog.action.like(f"{action}%"))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(AuditLog.id.desc()).offset((page - 1) * PAGE_SIZE).limit(PAGE_SIZE)).all()
    names = {u.id: u.name for u in db.scalars(select(User).where(User.id.in_({r.actor_id for r in rows if r.actor_id}))).all()}
    items = [{"id": r.id, "action": r.action, "actor_id": r.actor_id, "actor_name": names.get(r.actor_id) if r.actor_id else "시스템",
              "target_type": r.target_type, "target_id": r.target_id, "reason": r.reason, "detail": r.detail, "ip": r.ip, "created_at": r.created_at} for r in rows]
    return {"items": items, **page_meta(total, page)}

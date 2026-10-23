"""고객용 사건 API — 견적, 접수(문진 저장), 결제, 증거 업로드, 내 사건.

핵심 규칙: 고객은 변호사 검수를 마치고 발송까지 끝난 사건(DELIVERED)의 "검수 승인된 서면"만 내려받을 수 있다.
그 전 단계의 초안은 서버가 거부한다(기획서 IX 원칙 1 — 검수 없이 고객에게 나가는 경로를 시스템에서 차단).
"""

import secrets

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import storage, toss
from app.core.audit import record
from app.core.catalog import get_product
from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user, get_onboarded_user
from app.core.fees import quote
from app.core.notify import notify
from app.core.timeutil import now
from app.models.case import Case, CaseFile, CaseStatus, Payment
from app.models.user import User
from app.schemas.case import ConfirmIn, IntakeIn

router = APIRouter(tags=["cases"])

EVIDENCE_OPEN = (CaseStatus.PENDING_PAYMENT, CaseStatus.REVIEWING, CaseStatus.IN_PROGRESS)


def quote_dict(q) -> dict:
    return {
        "fee": q.fee, "vat": q.vat,
        "costs": [{"label": c.label, "amount": c.amount, "note": c.note} for c in q.costs],
        "costs_total": q.costs_total, "total": q.total,
    }


def file_dict(f: CaseFile) -> dict:
    return {"id": f.id, "kind": f.kind, "filename": f.filename, "size": f.size, "created_at": f.created_at}


def case_for_customer(c: Case, db: Session) -> dict:
    lawyer = db.get(User, c.lawyer_id) if c.lawyer_id else None
    files = [f for f in c.files if f.kind == "evidence"]
    if c.status == CaseStatus.DELIVERED and c.approved_file_id:
        files += [f for f in c.files if f.id == c.approved_file_id]
    return {
        "id": c.id, "case_no": c.case_no, "service_slug": c.service_slug, "service_name": c.service_name,
        "status": c.status, "status_label": c.status_label,
        "opponent_name": c.opponent_name, "claim_amount": c.claim_amount, "intake": c.intake,
        "fee": c.fee, "vat": c.vat, "costs": c.costs, "total": c.total,
        "lawyer_name": lawyer.name if lawyer else None,
        "reject_reason": c.reject_reason, "delivery_note": c.delivery_note,
        "created_at": c.created_at, "paid_at": c.paid_at, "accepted_at": c.accepted_at,
        "approved_at": c.approved_at, "delivered_at": c.delivered_at, "rejected_at": c.rejected_at, "due_at": c.due_at,
        "files": [file_dict(f) for f in files],
    }


def own_case(db: Session, case_id: int, user: User) -> Case:
    c = db.get(Case, case_id)
    if c is None or c.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="사건을 찾을 수 없습니다.")
    return c


# ---------- 견적 -------------------------------------------------------------


@router.get("/catalog/quote")
def get_quote(service: str, claim_amount: int | None = Query(default=None, ge=0, le=100_000_000_000)) -> dict:
    product = get_product(service)
    if product is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="지금은 접수할 수 없는 상품입니다.")
    return {"service_slug": product.slug, "service_name": product.name, "is_quote": product.fee is None, **quote_dict(quote(product, claim_amount))}


# ---------- 접수 -------------------------------------------------------------


@router.post("/cases")
def create_case(payload: IntakeIn, request: Request, user: User = Depends(get_onboarded_user), db: Session = Depends(get_db)) -> dict:
    product = get_product(payload.service_slug)
    if product is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="지금은 접수할 수 없는 상품입니다.")
    if product.needs_claim_amount and not payload.claim_amount:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="청구 금액을 입력해 주세요.")

    q = quote(product, payload.claim_amount)
    # 같은 상품의 결제 대기 사건이 있으면 새로 만들지 않고 덮어쓴다(뒤로가기·재시도로 사건이 쌓이지 않게)
    c = db.scalar(select(Case).where(Case.user_id == user.id, Case.service_slug == product.slug, Case.status == CaseStatus.PENDING_PAYMENT))
    if c is None:
        c = Case(user_id=user.id, service_slug=product.slug, service_name=product.name)
        db.add(c)
    c.intake = {"client_name": payload.client_name, "phone": payload.phone, "facts": payload.facts, "answers": payload.answers}
    c.opponent_name = (payload.opponent_name or "").strip() or None
    c.claim_amount = payload.claim_amount
    c.fee, c.vat, c.costs, c.total = q.fee, q.vat, quote_dict(q)["costs"], q.total
    c.source = payload.source

    if product.fee is None:
        # 심화 사건(개별 견적)은 결제 없이 바로 수임 검토로
        c.status = CaseStatus.REVIEWING
        c.paid_at = None
    db.flush()
    record(db, "case.create", actor_id=user.id, target_type="case", target_id=c.id, detail={"service": product.slug, "total": c.total}, request=request)
    db.commit()
    db.refresh(c)
    return case_for_customer(c, db)


@router.get("/cases")
def my_cases(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[dict]:
    rows = db.scalars(
        select(Case).where(Case.user_id == user.id, Case.status != CaseStatus.CANCELED).order_by(Case.id.desc())
    ).all()
    return [case_for_customer(c, db) for c in rows]


@router.get("/cases/{case_id}")
def get_case(case_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    return case_for_customer(own_case(db, case_id, user), db)


@router.post("/cases/{case_id}/cancel")
def cancel_case(case_id: int, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    c = own_case(db, case_id, user)
    if c.status != CaseStatus.PENDING_PAYMENT:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="결제 전 사건만 취소할 수 있습니다. 결제 후에는 고객센터로 문의해 주세요.")
    c.status = CaseStatus.CANCELED
    record(db, "case.cancel", actor_id=user.id, target_type="case", target_id=c.id, request=request)
    db.commit()
    return {"status": "ok"}


# ---------- 결제 -------------------------------------------------------------


@router.post("/cases/{case_id}/payment")
def start_payment(case_id: int, user: User = Depends(get_onboarded_user), db: Session = Depends(get_db)) -> dict:
    c = own_case(db, case_id, user)
    if c.status != CaseStatus.PENDING_PAYMENT:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="이미 결제했거나 결제할 수 없는 사건입니다.")
    # 토스 orderId: 영문·숫자·-·_ 6~64자. 시도마다 새로 발급(같은 orderId 재사용 불가).
    p = Payment(case_id=c.id, order_id=f"LS-{c.id}-{secrets.token_hex(6)}", amount=c.total, simulated=settings.payment_simulated)
    db.add(p)
    db.commit()
    return {
        "order_id": p.order_id, "amount": p.amount, "order_name": c.service_name,
        "customer_key": f"ls-user-{user.id}", "customer_name": c.intake.get("client_name") or user.name,
        "customer_phone": c.intake.get("phone") or user.phone,
        "client_key": settings.TOSS_CLIENT_KEY, "simulated": settings.payment_simulated,
    }


@router.post("/payments/confirm")
def confirm_payment(payload: ConfirmIn, request: Request, user: User = Depends(get_onboarded_user), db: Session = Depends(get_db)) -> dict:
    p = db.scalar(select(Payment).where(Payment.order_id == payload.order_id))
    if p is None or p.case.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="결제 정보를 찾을 수 없습니다.")
    c = p.case
    if p.status == "done":
        return case_for_customer(c, db)  # 새로고침 등 중복 호출
    if p.status != "ready" or c.status != CaseStatus.PENDING_PAYMENT:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="이미 처리된 결제입니다.")
    # 금액은 서버에 저장된 값과 반드시 같아야 한다(클라이언트 변조 방지)
    if payload.amount != p.amount or p.amount != c.total:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="결제 금액이 일치하지 않습니다.")

    if p.simulated:
        # 시뮬레이션은 결제를 만든 시점의 서버 설정으로만 정해진다 — 클라이언트가 켤 수 없다
        p.payment_key, p.method, p.raw = f"SIMULATED-{p.order_id}", "시뮬레이션", None
    else:
        data = toss.confirm(payload.payment_key, p.order_id, p.amount)
        if data.get("status") != "DONE":
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="결제가 완료되지 않았습니다.")
        p.payment_key, p.method, p.raw = payload.payment_key, data.get("method"), data

    p.status, p.approved_at = "done", now()
    c.status, c.paid_at = CaseStatus.REVIEWING, now()
    record(db, "payment.confirm", actor_id=user.id, target_type="case", target_id=c.id, detail={"order_id": p.order_id, "amount": p.amount, "simulated": p.simulated}, request=request)
    db.commit()
    notify(user, "paid", c)
    return case_for_customer(c, db)


# ---------- 파일 -------------------------------------------------------------


@router.post("/cases/{case_id}/files")
def upload_evidence(case_id: int, request: Request, file: UploadFile = File(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    c = own_case(db, case_id, user)
    if c.status not in EVIDENCE_OPEN:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="지금 단계에서는 자료를 추가할 수 없습니다. 담당자에게 문의해 주세요.")
    if sum(1 for f in c.files if f.kind == "evidence") >= 30:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="자료는 사건당 30개까지 올릴 수 있습니다.")
    stored, size, digest = storage.save(file)
    f = CaseFile(case_id=c.id, kind="evidence", filename=(file.filename or "file")[:255], stored_name=stored, content_type=file.content_type, size=size, sha256=digest, uploaded_by=user.id)
    db.add(f)
    db.flush()
    record(db, "file.upload", actor_id=user.id, target_type="case", target_id=c.id, detail={"file_id": f.id, "kind": "evidence", "filename": f.filename}, request=request)
    db.commit()
    return file_dict(f)


def can_download(user: User, f: CaseFile) -> bool:
    if user.is_staff:
        return True
    c = f.case
    if c.user_id != user.id:
        return False
    if f.kind == "evidence":
        return True
    return c.status == CaseStatus.DELIVERED and c.approved_file_id == f.id


@router.get("/files/{file_id}")
def download(file_id: int, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> FileResponse:
    f = db.get(CaseFile, file_id)
    if f is None or not can_download(user, f):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="파일을 찾을 수 없습니다.")
    record(db, "file.download", actor_id=user.id, target_type="case", target_id=f.case_id, detail={"file_id": f.id}, request=request)
    db.commit()
    return FileResponse(storage.open_path(f.stored_name), filename=f.filename, media_type=f.content_type or "application/octet-stream")

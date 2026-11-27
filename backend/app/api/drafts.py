"""서면 초안 API(직원 전용). 관리자 화면의 사건 상세에서 쓴다.

- 초안은 고칠 때마다 새 버전이 된다. AI 생성·다시 생성(추가 프롬프트 저장)·직접 수정 모두 같다.
- 감사 기록에는 버전 번호·출처·모델만 남기고 본문과 추가 프롬프트 내용은 남기지 않는다(비밀유지).
- 초안은 고객에게 보이지 않는다. 고객에게 가는 서면은 기존 흐름대로 파일 업로드 → 변호사 검수를 거친다.
"""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.admin import get_staff_user, require, staff_case
from app.core.audit import record
from app.core.config import settings
from app.core.database import get_db
from app.drafting import llm, service
from app.drafting.templates import template_for
from app.models.case import CaseStatus
from app.models.draft import DocumentDraft
from app.models.user import User
from app.schemas.draft import DraftGenerateIn, DraftSaveIn

router = APIRouter(prefix="/admin", tags=["admin-drafts"])

# 초안을 만들 수 있는 사건 상태 — 결제 전·종결 사건에는 만들지 않는다
DRAFTABLE = (CaseStatus.REVIEWING, CaseStatus.IN_PROGRESS, CaseStatus.LAWYER_REVIEW)


def draft_dict(d: DocumentDraft, names: dict[int, str]) -> dict:
    return {
        "id": d.id, "version": d.version, "content": d.content, "source": d.source, "status": d.status, "error": d.error,
        "model": d.model, "extra_prompt": d.extra_prompt, "base_version": d.base_version, "exemplar_ids": d.exemplar_ids,
        "flagged_citations": d.flagged_citations, "input_tokens": d.input_tokens, "output_tokens": d.output_tokens,
        "latency_ms": d.latency_ms, "created_by_name": names.get(d.created_by or 0), "created_at": d.created_at,
    }


def _names(db: Session, rows: list[DocumentDraft]) -> dict[int, str]:
    ids = {d.created_by for d in rows if d.created_by}
    return dict(db.execute(select(User.id, User.name).where(User.id.in_(ids))).all()) if ids else {}


def _check_base(db: Session, case_id: int, base_version: int | None) -> None:
    if base_version is None:
        return
    base = service.get_version(db, case_id, base_version)
    if base is None or base.status != "ready":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="바탕으로 할 초안 버전을 찾을 수 없습니다.")


@router.get("/drafting/status")
def drafting_status(_: User = Depends(get_staff_user)) -> dict:
    return {"enabled": settings.drafting_enabled, "provider": settings.LLM_PROVIDER or None, "model": llm.model_name() or None}


@router.get("/cases/{case_id}/drafts")
def list_drafts(case_id: int, staff: User = Depends(get_staff_user), db: Session = Depends(get_db)) -> dict:
    c = staff_case(db, case_id)
    service.expire_stale(db, c.id)
    db.expire_all()  # 백그라운드 생성이 다른 세션에서 바꾼 내용을 다시 읽는다
    rows = db.scalars(select(DocumentDraft).where(DocumentDraft.case_id == c.id).order_by(DocumentDraft.version.desc())).all()
    tpl = template_for(c.service_slug)
    names = _names(db, list(rows))
    return {
        "items": [draft_dict(d, names) for d in rows],
        "template": {"title": tpl.title, "placeholder": tpl.placeholder, "sections": [s.title for s in tpl.sections],
                     "allowed_citations": list(tpl.allowed_citations)},
        "can_generate": c.status in [s.value for s in DRAFTABLE],
    }


@router.post("/cases/{case_id}/drafts/generate")
def generate_draft(case_id: int, payload: DraftGenerateIn, background: BackgroundTasks, request: Request,
                   staff: User = Depends(get_staff_user), db: Session = Depends(get_db)) -> dict:
    c = staff_case(db, case_id)
    require(c, *DRAFTABLE)
    if not settings.drafting_enabled:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI 초안 생성이 아직 설정되지 않았습니다.")
    service.expire_stale(db, c.id)
    if db.scalar(select(DocumentDraft.id).where(DocumentDraft.case_id == c.id, DocumentDraft.status == "generating")):
        raise HTTPException(status.HTTP_409_CONFLICT, detail="이미 초안을 생성하고 있습니다. 끝난 뒤 다시 시도해 주세요.")
    _check_base(db, c.id, payload.base_version)
    extra = (payload.extra_prompt or "").strip() or None
    d = service.start_ai(db, c, extra, payload.base_version, staff.id)
    record(db, "draft.generate", actor_id=staff.id, target_type="case", target_id=c.id,
           detail={"version": d.version, "base_version": d.base_version, "model": d.model, "extra_prompt": bool(extra)}, request=request)
    db.commit()
    background.add_task(service.run_ai, db.get_bind(), d.id)
    return draft_dict(d, {staff.id: staff.name})


@router.post("/cases/{case_id}/drafts")
def save_draft(case_id: int, payload: DraftSaveIn, request: Request, staff: User = Depends(get_staff_user), db: Session = Depends(get_db)) -> dict:
    """직접 수정 — 새 버전(source=human)으로 저장한다. 인용 대조도 다시 한다."""
    c = staff_case(db, case_id)
    require(c, *DRAFTABLE)
    _check_base(db, c.id, payload.base_version)
    d = service.save_human(db, c, payload.content, payload.base_version, staff.id)
    record(db, "draft.save", actor_id=staff.id, target_type="case", target_id=c.id,
           detail={"version": d.version, "base_version": d.base_version, "flagged": len(d.flagged_citations)}, request=request)
    db.commit()
    return draft_dict(d, {staff.id: staff.name})

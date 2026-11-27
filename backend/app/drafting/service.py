"""초안 버전 만들기와 백그라운드 생성.

생성은 1~2분 걸릴 수 있어 요청 안에서 기다리지 않는다: "generating" 버전을 먼저 만들어 돌려주고,
응답 뒤 백그라운드에서 모델을 불러 채운다(화면은 몇 초마다 다시 읽는다). 백그라운드는 요청과 다른 DB 세션을 쓴다.
서버가 생성 도중 재시작되면 그 버전은 "generating"으로 남는다 — STALE_AFTER 가 지나면 실패로 바꾼다.
"""

import logging
import time
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.engine import Connection, Engine
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.timeutil import aware, now
from app.drafting import citations, llm, prompt
from app.drafting.templates import template_for
from app.models.case import Case
from app.models.draft import DocumentDraft, DraftExemplar

log = logging.getLogger(__name__)

STALE_AFTER = timedelta(minutes=10)


def next_version(db: Session, case_id: int) -> int:
    return (db.scalar(select(func.max(DocumentDraft.version)).where(DocumentDraft.case_id == case_id)) or 0) + 1


def get_version(db: Session, case_id: int, version: int) -> DocumentDraft | None:
    return db.scalar(select(DocumentDraft).where(DocumentDraft.case_id == case_id, DocumentDraft.version == version))


def expire_stale(db: Session, case_id: int) -> None:
    rows = db.scalars(select(DocumentDraft).where(DocumentDraft.case_id == case_id, DocumentDraft.status == "generating")).all()
    changed = False
    for d in rows:
        if d.created_at and now() - aware(d.created_at) > STALE_AFTER:
            d.status, d.error = "failed", "생성 시간이 초과되었습니다. 다시 생성해 주세요."
            changed = True
    if changed:
        db.commit()


def pick_exemplars(db: Session, slug: str) -> list[DraftExemplar]:
    """같은 상품의 활성·비식별화 확인된 예시를 최신순으로, 개수·글자 수 상한 안에서 고른다.
    (예시가 많아지면 여기서 사실관계 유사도로 고르도록 바꾼다 — models/draft.py 의 TODO)"""
    rows = db.scalars(
        select(DraftExemplar)
        .where(DraftExemplar.service_slug == slug, DraftExemplar.active.is_(True), DraftExemplar.deidentified_checked_by.is_not(None))
        .order_by(DraftExemplar.id.desc())
        .limit(settings.DRAFT_MAX_EXEMPLARS)
    ).all()
    picked, budget = [], settings.DRAFT_EXEMPLAR_CHAR_BUDGET
    for ex in rows:
        if len(ex.content) > budget:
            continue
        picked.append(ex)
        budget -= len(ex.content)
    return picked


def save_human(db: Session, c: Case, content: str, base_version: int | None, user_id: int) -> DocumentDraft:
    d = DocumentDraft(
        case_id=c.id, version=next_version(db, c.id), content=content, source="human", status="ready",
        base_version=base_version, exemplar_ids=[], created_by=user_id,
        flagged_citations=citations.flag(content, template_for(c.service_slug).allowed_citations),
    )
    db.add(d)
    db.flush()
    return d


def start_ai(db: Session, c: Case, extra_prompt: str | None, base_version: int | None, user_id: int) -> DocumentDraft:
    d = DocumentDraft(
        case_id=c.id, version=next_version(db, c.id), content="", source="ai", status="generating",
        model=llm.model_name(), extra_prompt=extra_prompt or None, base_version=base_version,
        exemplar_ids=[], flagged_citations=[], created_by=user_id,
    )
    db.add(d)
    db.flush()
    return d


def run_ai(bind: Engine | Connection, draft_id: int) -> None:
    """백그라운드에서 실행. 실패해도 예외를 밖으로 내지 않고 버전에 실패 사유를 남긴다(사건 본문은 남기지 않는다)."""
    with Session(bind=bind) as db:
        d = db.get(DocumentDraft, draft_id)
        if d is None or d.status != "generating":
            return
        c = db.get(Case, d.case_id)
        tpl = template_for(c.service_slug)
        base = get_version(db, c.id, d.base_version) if d.base_version else None
        exemplars = pick_exemplars(db, c.service_slug)
        system, messages = prompt.build(c, tpl, exemplars, base.content if base else None, d.extra_prompt)
        started = time.monotonic()
        try:
            text, usage = llm.generate(system, messages)
        except (llm.DraftingDisabled, llm.LLMError) as e:
            d.status, d.error = "failed", str(e)
        except Exception as e:  # noqa: BLE001 — 어떤 실패든 "생성 중"에 멈춰 있지 않게
            log.exception("draft generation failed (draft_id=%s)", draft_id)
            d.status, d.error = "failed", f"초안 생성 중 오류가 났습니다({type(e).__name__})."
        else:
            d.content, d.status = text, "ready"
            d.model = usage.get("model") or d.model
            d.input_tokens, d.output_tokens = usage.get("input_tokens"), usage.get("output_tokens")
            d.exemplar_ids = [ex.id for ex in exemplars]
            d.flagged_citations = citations.flag(text, tpl.allowed_citations)
        d.latency_ms = int((time.monotonic() - started) * 1000)
        db.commit()

"""서면 초안(AI 생성·직접 수정)과 초안 예시 서면.

초안은 고칠 때마다 새 버전으로 쌓는다(덮어쓰지 않는다). 버전마다 누가·어떤 모델로·어떤 추가 프롬프트로 만들었는지,
어느 예시 서면을 참고했는지 남긴다 — 기획서 VIII "AI 로그 보존"을 B 체제에서 미리 쌓아 두는 것.
초안은 직원 화면에서만 보인다. 고객에게 나가는 것은 변호사 검수를 거친 서면 파일뿐이다(검수 흐름은 그대로).
사건 정보는 비밀유지 대상 — 초안 본문을 로그·감사 기록에 남기지 않는다.
"""

from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DocumentDraft(Base):
    __tablename__ = "document_drafts"
    __table_args__ = (UniqueConstraint("case_id", "version", name="uq_document_drafts_case_version"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    source: Mapped[str] = mapped_column(String(10), nullable=False)  # ai | human
    status: Mapped[str] = mapped_column(String(12), nullable=False, default="ready")  # generating | ready | failed
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    model: Mapped[str | None] = mapped_column(String(120), nullable=True)
    # 다시 생성할 때 담당자가 덧붙인 지시(예: "청구원인을 더 짧게"). 템플릿·프롬프트 개선 자료가 된다.
    extra_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 어느 버전을 바탕으로 고쳤는지(AI 고쳐 쓰기·직접 수정). 처음부터 생성하면 None
    base_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    exemplar_ids: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    # 허용 목록에 없는 법령·판례 인용 — [{"kind", "ref"}]. 변호사가 원문을 확인해야 한다.
    flagged_citations: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    input_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    output_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class DraftExemplar(Base):
    """초안 생성 때 문체·구성의 본보기로 넣는 잘 쓴 서면. 반드시 비식별화한 본문만 넣는다.

    지금은 같은 상품(service_slug)의 활성·비식별화 확인된 예시를 최신순으로 고른다.
    TODO(예시가 많아지면): pgvector 를 설치하고 embedding 열을 추가해 사실관계가 비슷한 예시를 고른다 —
    drafting/service.py 의 pick_exemplars 만 바꾸면 된다.
    """

    __tablename__ = "draft_exemplars"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    service_slug: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 비식별화(이름·주민번호·주소·계좌 제거)를 확인한 변호사. 확인 전에는 생성에 쓰지 않는다.
    deidentified_checked_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

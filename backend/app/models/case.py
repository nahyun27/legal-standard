from datetime import datetime, timezone
from enum import StrEnum
from zoneinfo import ZoneInfo

from sqlalchemy import JSON, BigInteger, Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


KST = ZoneInfo("Asia/Seoul")


class CaseStatus(StrEnum):
    PENDING_PAYMENT = "pending_payment"  # 문진 저장, 결제 대기
    REVIEWING = "reviewing"              # 결제 완료 → 변호사 수임 검토(이해충돌 포함)
    IN_PROGRESS = "in_progress"          # 수임 확정 → 서면 준비
    LAWYER_REVIEW = "lawyer_review"      # 변호사 검수 대기
    APPROVED = "approved"                # 검수 완료 → 발송·제출 준비
    DELIVERED = "delivered"              # 발송·제출 완료
    REJECTED = "rejected"                # 수임 불성립 → 전액 환불
    CANCELED = "canceled"                # 결제 전 취소


STATUS_LABEL = {
    CaseStatus.PENDING_PAYMENT: "결제 대기",
    CaseStatus.REVIEWING: "수임 검토 중",
    CaseStatus.IN_PROGRESS: "서면 준비 중",
    CaseStatus.LAWYER_REVIEW: "변호사 검수 중",
    CaseStatus.APPROVED: "발송 준비",
    CaseStatus.DELIVERED: "완료",
    CaseStatus.REJECTED: "수임 불성립(환불)",
    CaseStatus.CANCELED: "취소",
}

OPEN_STATUSES = (CaseStatus.REVIEWING, CaseStatus.IN_PROGRESS, CaseStatus.LAWYER_REVIEW, CaseStatus.APPROVED)


class Case(Base):
    __tablename__ = "cases"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    service_slug: Mapped[str] = mapped_column(String(40), nullable=False)
    service_name: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=CaseStatus.PENDING_PAYMENT, index=True)

    # 문진 원문(상품별 문항). 사건 정보는 비밀유지 대상 — 외부 AI 학습·다른 목적 재사용 금지(기획서 X-4).
    intake: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    # 이해충돌 확인용으로 따로 뽑아 둔다(검색 대상)
    opponent_name: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    # 이해충돌 대조용 정규화 키("(주) 상대 상사" → "상대상사"). conflict.name_key() 로 만든다.
    opponent_key: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    # 여정 연결 — 이 사건이 어느 사건의 "다음 단계"로 신청됐는지(T1→후속 전환율 측정, 기획서 KPI)
    parent_case_id: Mapped[int | None] = mapped_column(ForeignKey("cases.id"), nullable=True, index=True)
    claim_amount: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    # 금액 스냅샷 — 결제 시점의 정찰가를 고정한다(이후 가격이 바뀌어도 이 사건엔 영향 없음)
    fee: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    vat: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    costs: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    lawyer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    reviewer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    approved_file_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    review_checklist: Mapped[list | None] = mapped_column(JSON, nullable=True)
    reject_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    delivery_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 유입 경로(채널별 CAC 계산용, 기획서 KPI). 포트폴리오 사이트 간 연결도 정산 없이 기록만.
    source: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # 결제 전 동의(수임 조건·청약철회 제한 고지) — {"version": …, "agreed_at": …, "items": […]}
    consents: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # 심화 사건 견적 안내 문구(고객에게 보임)
    quote_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # 변호사가 검수 대기 사건을 처음 연 시각 — 실제 검수시간(기획서 KPI 45분) 측정용. 반려되면 비운다.
    review_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    review_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reminded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    files: Mapped[list["CaseFile"]] = relationship(back_populates="case", order_by="CaseFile.id")
    payments: Mapped[list["Payment"]] = relationship(back_populates="case", order_by="Payment.id")

    @property
    def case_no(self) -> str:
        # 접수일은 한국 시각 기준(UTC 로 찍으면 새벽 접수 사건의 날짜가 하루 앞당겨진다)
        d = self.created_at or datetime.now(timezone.utc)
        d = (d if d.tzinfo else d.replace(tzinfo=timezone.utc)).astimezone(KST)
        return f"LS{d:%y%m%d}-{self.id:05d}"

    @property
    def status_label(self) -> str:
        return STATUS_LABEL[CaseStatus(self.status)]


class CaseFile(Base):
    """증거(의뢰인 업로드)와 서면(법인 작성). 실제 파일은 STORAGE_DIR 에 무작위 이름으로 저장한다."""

    __tablename__ = "case_files"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)  # evidence | document
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_name: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    content_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    size: Mapped[int] = mapped_column(Integer, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)  # 위·변조 확인용
    uploaded_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    case: Mapped[Case] = relationship(back_populates="files")


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    order_id: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)  # 토스 orderId
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ready")  # ready | done | canceled | failed
    payment_key: Mapped[str | None] = mapped_column(String(200), nullable=True)
    method: Mapped[str | None] = mapped_column(String(40), nullable=True)
    simulated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    canceled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancel_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    receipt_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    case: Mapped[Case] = relationship(back_populates="payments")

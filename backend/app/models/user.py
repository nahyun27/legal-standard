from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class User(Base):
    """회원. 가입은 소셜 로그인으로만 받는다(비밀번호를 저장하지 않음).

    가입 2단계: ① 소셜 로그인 시 계정 생성(onboarded_at=None) → ② /signup 에서 필수 약관 동의 + 실명·연락처
    입력 시 onboarded_at 기록. 수임계약·위임장·이해충돌 확인에 실명과 연락처가 필요하므로(사업기획서 IX)
    ②를 마치지 않은 계정은 문진 제출·결제를 할 수 없다(deps.get_onboarded_user).
    """

    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("social_provider", "social_id", name="uq_users_social"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    social_provider: Mapped[str] = mapped_column(String(20), nullable=False)  # kakao | naver | dev
    social_id: Mapped[str] = mapped_column(String(255), nullable=False)
    # 카카오는 이메일 제공이 선택 동의라 없을 수 있다 — 같은 이메일이라고 다른 provider 계정을 자동으로 합치지 않는다
    # (계정 탈취 경로가 될 수 있어서. 합치기가 필요하면 로그인한 상태에서 연결하는 기능을 따로 만든다).
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)

    name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # 휴대폰 본인인증(PASS 등) 완료 시각 — 인증 업체 계약 후 연결. 지금은 항상 None.
    phone_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    terms_agreed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    privacy_agreed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # 광고성 정보 수신 — 정보통신망법상 동의한 사람에게만 보낸다. None = 아직 묻지 않음.
    marketing_consent: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    marketing_consent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    onboarded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # is_active=False 의 사유 구분. 탈퇴는 되돌릴 수 없고(개인정보 삭제됨), 정지는 관리자가 해제할 수 있다.
    withdrawn_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    suspended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # 서면 검수(검수 완료 처리)는 변호사만 할 수 있다 — 기획서 IX 원칙 1 "서면 확정의 주체는 변호사"
    is_lawyer: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # 로그아웃·탈퇴 시 올려서 이미 발급된 토큰(특히 14일짜리 refresh)을 전부 무효화한다.
    token_version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    @property
    def is_onboarded(self) -> bool:
        return self.onboarded_at is not None

    @property
    def is_staff(self) -> bool:
        return self.is_admin or self.is_lawyer

    @property
    def status(self) -> str:
        if self.withdrawn_at is not None:
            return "withdrawn"
        if self.suspended_at is not None or not self.is_active:
            return "suspended"
        return "active" if self.is_onboarded else "pending"

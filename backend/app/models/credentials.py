from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PasswordReset(Base):
    """비밀번호 재설정 링크. 링크의 토큰 원문은 메일로만 나가고 여기에는 SHA-256 해시만 남긴다(DB 가 새도 링크를 못 만든다).
    한 번 쓰면 used_at 이 찍히고, 새 링크를 만들거나 비밀번호를 바꾸면 남은 링크는 전부 못 쓰게 된다."""

    __tablename__ = "password_resets"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class LoginFailure(Base):
    """비밀번호 로그인 실패 기록 — 무차별 대입을 막는 잠금 판단에 쓴다. 서버 프로세스가 여러 개여도 같은 기준을 쓰도록 DB 에 둔다.
    key 는 "email:<이메일>" 또는 "ip:<주소>". 오래된 줄은 정기 작업(housekeeping)이 지운다."""

    __tablename__ = "login_failures"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

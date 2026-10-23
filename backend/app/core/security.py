from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from jose import JWTError, jwt

from app.core.config import settings

TokenType = Literal["access", "refresh"]

__all__ = ["JWTError", "create_access_token", "create_refresh_token", "decode_token"]


def _create_token(subject: int, token_type: TokenType, expires: timedelta, version: int) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {"sub": str(subject), "type": token_type, "ver": version, "iat": now, "exp": now + expires}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(user_id: int, version: int) -> str:
    return _create_token(user_id, "access", timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES), version)


def create_refresh_token(user_id: int, version: int) -> str:
    return _create_token(user_id, "refresh", timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS), version)


def decode_token(token: str, expected_type: TokenType) -> dict[str, Any]:
    payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    if payload.get("type") != expected_type:
        raise JWTError(f"Invalid token type: expected {expected_type}")
    return payload

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.cookies import get_access_token
from app.core.database import get_db
from app.core.security import JWTError, decode_token
from app.models.user import User


def user_from_token(db: Session, token: str | None, expected_type: str) -> User | None:
    """토큰이 유효하고, 계정이 활성이고, 토큰 버전이 현재 버전과 같을 때만 사용자를 돌려준다."""
    if not token:
        return None
    try:
        payload = decode_token(token, expected_type)  # type: ignore[arg-type]
        user_id = int(payload["sub"])
        version = int(payload.get("ver", -1))
    except (JWTError, KeyError, ValueError):
        return None
    user = db.get(User, user_id)
    if user is None or not user.is_active or user.token_version != version:
        return None
    return user


def get_current_user_optional(request: Request, db: Session = Depends(get_db)) -> User | None:
    return user_from_token(db, get_access_token(request), "access")


def get_current_user(user: User | None = Depends(get_current_user_optional)) -> User:
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="로그인이 필요합니다.")
    return user


def get_onboarded_user(user: User = Depends(get_current_user)) -> User:
    """문진 제출·결제처럼 실명·연락처·필수 약관 동의가 있어야 하는 기능에 쓴다."""
    if not user.is_onboarded:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="회원가입(약관 동의·본인 정보 입력)을 마쳐 주세요.")
    return user


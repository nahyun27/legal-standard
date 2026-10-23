"""직원 2단계 인증(TOTP). 회원 정보·사건 자료를 모두 볼 수 있는 계정이라 소셜 로그인만으로는 부족하다.

로그인(소셜) 후 관리자 화면에서 인증 앱 코드를 확인하면 별도 쿠키(ls_mfa, ADMIN_MFA_HOURS 유효)를 준다.
로그아웃·정지로 token_version 이 바뀌면 이 쿠키도 함께 무효가 된다.
"""

import base64
import io
import time
from collections import defaultdict

import pyotp
import qrcode
import qrcode.image.svg
from fastapi import HTTPException, Request, Response, status

from app.core.config import settings
from app.core.security import JWTError, create_mfa_token, decode_token
from app.models.user import User

MFA_COOKIE = "ls_mfa"
ISSUER = "리걸스탠다드 관리자"
_failures: dict[int, list[float]] = defaultdict(list)


def new_secret() -> str:
    return pyotp.random_base32()


def provisioning(user: User) -> dict:
    uri = pyotp.TOTP(user.totp_secret or "").provisioning_uri(name=f"{user.name or 'staff'}#{user.id}", issuer_name=ISSUER)
    buf = io.BytesIO()
    qrcode.make(uri, image_factory=qrcode.image.svg.SvgPathImage, box_size=8).save(buf)
    return {"otpauth_uri": uri, "secret": user.totp_secret, "qr_svg": "data:image/svg+xml;base64," + base64.b64encode(buf.getvalue()).decode()}


def verify_code(user: User, code: str) -> bool:
    """10분에 5번까지만 틀릴 수 있다(무차별 대입 방지). 앞뒤 30초 오차는 허용."""
    window = [t for t in _failures[user.id] if t > time.time() - 600]
    _failures[user.id] = window
    if len(window) >= 5:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail="인증 코드를 여러 번 틀렸습니다. 10분 뒤 다시 시도해 주세요.")
    ok = bool(user.totp_secret) and pyotp.TOTP(user.totp_secret).verify(code.strip().replace(" ", ""), valid_window=1)
    if not ok:
        _failures[user.id].append(time.time())
    else:
        _failures.pop(user.id, None)
    return ok


def set_mfa_cookie(response: Response, user: User) -> None:
    response.set_cookie(
        MFA_COOKIE, create_mfa_token(user.id, user.token_version), max_age=settings.ADMIN_MFA_HOURS * 3600,
        httponly=True, secure=settings.COOKIE_SECURE, samesite="lax", path=f"{settings.API_V1_PREFIX}/admin",
    )


def clear_mfa_cookie(response: Response) -> None:
    response.delete_cookie(MFA_COOKIE, path=f"{settings.API_V1_PREFIX}/admin")


def mfa_passed(request: Request, user: User) -> bool:
    token = request.cookies.get(MFA_COOKIE)
    if not token or not user.totp_enabled_at:
        return False
    try:
        payload = decode_token(token, "mfa")
    except JWTError:
        return False
    return payload.get("sub") == str(user.id) and payload.get("ver") == user.token_version

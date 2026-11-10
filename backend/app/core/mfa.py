"""직원 2단계 인증. 회원 정보·사건 자료를 모두 볼 수 있는 계정이라 로그인만으로는 부족하다.
방식은 둘 중 하나 — 인증 앱(TOTP) 또는 가입 이메일로 받는 6자리 코드(인증 앱이 없는 직원용).

로그인(소셜) 후 관리자 화면에서 인증 앱 코드를 확인하면 별도 쿠키(ls_mfa, ADMIN_MFA_HOURS 유효)를 준다.
로그아웃·정지로 token_version 이 바뀌면 이 쿠키도 함께 무효가 된다.
"""

import base64
import hashlib
import hmac
import io
import secrets
import time
from datetime import timedelta
from collections import defaultdict

import pyotp
import qrcode
import qrcode.image.svg
from fastapi import HTTPException, Request, Response, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import JWTError, create_mfa_token, decode_token
from app.core.notify import send_mail
from app.core.timeutil import aware, now
from app.models.credentials import MfaEmailCode
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
    if not token or not user.mfa_enabled:
        return False
    try:
        payload = decode_token(token, "mfa")
    except JWTError:
        return False
    return payload.get("sub") == str(user.id) and payload.get("ver") == user.token_version


# ---------- 이메일 코드 --------------------------------------------------------

EMAIL_CODE_MINUTES = 10
EMAIL_CODE_MAX_ATTEMPTS = 5
EMAIL_SENDS_PER_HOUR = 5


def _code_hash(user_id: int, code: str) -> str:
    # 6자리라 그냥 해시하면 DB 가 새는 순간 바로 역산된다 — 서버 비밀값으로 HMAC
    return hmac.new(settings.JWT_SECRET_KEY.encode(), f"mfa:{user_id}:{code}".encode(), hashlib.sha256).hexdigest()


def mask_email(email: str) -> str:
    local, _, domain = email.partition("@")
    return f"{local[:2]}{'*' * max(1, len(local) - 2)}@{domain}"


def send_email_code(db: Session, user: User) -> str:
    """새 코드를 만들어 가입 이메일로 보낸다. 이전 코드는 못 쓰게 된다. 돌려주는 값은 가린 이메일 주소."""
    if not user.email:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="계정에 이메일이 없어 이메일 인증을 쓸 수 없습니다.")
    if settings.ENV == "production" and not settings.mail_enabled:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="메일 발송이 아직 설정되지 않아 이메일 인증을 쓸 수 없습니다. 서버 관리자에게 문의해 주세요.")
    t = now()
    sent = db.scalar(select(func.count()).select_from(MfaEmailCode).where(MfaEmailCode.user_id == user.id, MfaEmailCode.created_at > t - timedelta(hours=1)))
    if sent >= EMAIL_SENDS_PER_HOUR:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail="인증 메일을 너무 자주 요청했습니다. 1시간 뒤 다시 시도해 주세요.")
    db.execute(delete(MfaEmailCode).where(MfaEmailCode.user_id == user.id, MfaEmailCode.created_at < t - timedelta(days=1)))
    for old in db.scalars(select(MfaEmailCode).where(MfaEmailCode.user_id == user.id, MfaEmailCode.used_at.is_(None))):
        old.used_at = t
    code = f"{secrets.randbelow(1_000_000):06d}"
    db.add(MfaEmailCode(user_id=user.id, code_hash=_code_hash(user.id, code), expires_at=t + timedelta(minutes=EMAIL_CODE_MINUTES), created_at=t))
    db.commit()
    send_mail(
        user.email,
        f"[리걸스탠다드] 관리자 인증 코드 {code}",
        f"관리자 화면 2단계 인증 코드는 {code} 입니다.\n{EMAIL_CODE_MINUTES}분 안에 입력해 주세요.\n\n"
        "직접 요청하지 않았다면 누군가 이 계정의 비밀번호를 알고 있을 수 있습니다. 비밀번호를 바로 바꿔 주세요.",
    )
    return mask_email(user.email)


def verify_email_code(db: Session, user: User, code: str) -> bool:
    row = db.scalar(
        select(MfaEmailCode).where(MfaEmailCode.user_id == user.id, MfaEmailCode.used_at.is_(None)).order_by(MfaEmailCode.id.desc()).limit(1)
    )
    if not row or aware(row.expires_at) < now():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="인증 코드가 만료되었습니다. 코드를 다시 받아 주세요.")
    if row.attempts >= EMAIL_CODE_MAX_ATTEMPTS:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail="인증 코드를 여러 번 틀렸습니다. 코드를 다시 받아 주세요.")
    if hmac.compare_digest(row.code_hash, _code_hash(user.id, code.strip().replace(" ", ""))):
        row.used_at = now()
        db.commit()
        return True
    row.attempts += 1
    db.commit()
    return False

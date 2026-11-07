"""이메일·비밀번호 로그인의 비밀번호 처리.

- 저장: 표준 라이브러리 scrypt(메모리 비용이 커서 GPU 대입에 강하다)로 해시한다. 원문·복원 가능한 값은 어디에도 남기지 않는다.
  형식 "scrypt$n$r$p$salt(b64)$hash(b64)" — 나중에 비용을 올려도 예전 해시를 그대로 확인할 수 있게 매개변수를 함께 적는다.
- 규칙: 10자 이상, 너무 흔한 비밀번호·이메일 아이디와 같은 비밀번호 거부.
- 잠금: 같은 이메일로 15분에 5번, 같은 IP 로 15분에 30번 틀리면 15분 동안 막는다(login_failures 테이블).
"""

import base64
import hashlib
import hmac
import re
import secrets
from datetime import timedelta

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.timeutil import now
from app.models.credentials import LoginFailure

N, R, P = 2**14, 8, 1
MIN_LENGTH = 10
WINDOW = timedelta(minutes=15)
EMAIL_LIMIT = 5
IP_LIMIT = 30

# 유출 목록 상위권 — 길이 규칙을 통과하는 것만 추렸다
COMMON = {
    "1234567890", "12345678910", "qwertyuiop", "1q2w3e4r5t", "1q2w3e4r5t6y", "qwer1234!!", "password12", "password123",
    "password1!", "passw0rd!!", "iloveyou12", "abcd123456", "a123456789", "aaaaaaaaaa", "1111111111", "0000000000",
    "asdfghjkl;", "zxcvbnm123", "qwerty1234", "admin12345", "letmein123", "welcome123",
}

_EMAIL = re.compile(r"^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$")


def normalize_email(v: str) -> str:
    v = v.strip().lower()
    if len(v) > 254 or not _EMAIL.match(v):
        raise ValueError("이메일 주소 형식이 올바르지 않습니다.")
    return v


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=N, r=R, p=P, dklen=32)
    b64 = lambda b: base64.b64encode(b).decode()  # noqa: E731
    return f"scrypt${N}${R}${P}${b64(salt)}${b64(digest)}"


def verify_password(password: str, stored: str | None) -> bool:
    """저장된 해시가 없어도 같은 시간을 쓰게 한다 — 응답 시간으로 가입 여부를 알아내지 못하게."""
    try:
        algo, n, r, p, salt_b64, hash_b64 = (stored or "").split("$")
        if algo != "scrypt":
            raise ValueError
        salt, expected = base64.b64decode(salt_b64), base64.b64decode(hash_b64)
        n_, r_, p_ = int(n), int(r), int(p)
    except ValueError:
        hashlib.scrypt(password.encode(), salt=b"0" * 16, n=N, r=R, p=P, dklen=32)
        return False
    got = hashlib.scrypt(password.encode(), salt=salt, n=n_, r=r_, p=p_, dklen=len(expected))
    return hmac.compare_digest(got, expected)


def check_policy(password: str, email: str | None = None) -> str:
    if len(password) < MIN_LENGTH:
        raise ValueError(f"비밀번호는 {MIN_LENGTH}자 이상으로 정해 주세요.")
    if len(password) > 128:
        raise ValueError("비밀번호는 128자 이하로 정해 주세요.")
    lowered = password.lower()
    if lowered in COMMON or len(set(password)) < 4:
        raise ValueError("너무 쉬운 비밀번호입니다. 다른 비밀번호를 정해 주세요.")
    if email and lowered.startswith(email.split("@")[0].lower()) and len(email.split("@")[0]) >= 4:
        raise ValueError("이메일 아이디가 들어간 비밀번호는 쓸 수 없습니다.")
    return password


def _count(db: Session, key: str) -> int:
    return db.scalar(select(func.count(LoginFailure.id)).where(LoginFailure.key == key, LoginFailure.created_at > now() - WINDOW)) or 0


def guard_attempts(db: Session, email: str, ip: str | None) -> None:
    if _count(db, f"email:{email}") >= EMAIL_LIMIT or (ip and _count(db, f"ip:{ip}") >= IP_LIMIT):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail="로그인을 여러 번 실패했습니다. 15분 뒤 다시 시도하거나 비밀번호 찾기를 이용해 주세요.")


def record_failure(db: Session, email: str, ip: str | None) -> None:
    t = now()
    db.add(LoginFailure(key=f"email:{email}", created_at=t))
    if ip:
        db.add(LoginFailure(key=f"ip:{ip}", created_at=t))
    db.commit()


def clear_failures(db: Session, email: str) -> None:
    db.execute(delete(LoginFailure).where(LoginFailure.key == f"email:{email}"))


def purge_old_failures(db: Session) -> int:
    res = db.execute(delete(LoginFailure).where(LoginFailure.created_at < now() - timedelta(days=1)))
    return res.rowcount or 0

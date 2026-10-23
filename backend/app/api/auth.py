"""회원 인증 — 소셜 로그인(카카오·네이버) + 가입 마무리(약관·실명·연락처) + 개발용 로그인.

소셜 로그인은 백엔드가 주도한다(KCPEC 과 같은 B-flow): 인가 → 콜백에서 토큰 교환 → 프로필 조회 →
find-or-create → httpOnly 쿠키 발급 → 프론트 /auth/callback 으로 redirect. 토큰은 URL·응답 body 로 나가지 않는다.
"""

import secrets
from datetime import datetime, timezone
from typing import Literal
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.cookies import clear_auth_cookies, get_access_token, get_refresh_token, set_auth_cookies
from app.core.database import get_db
from app.core.deps import get_current_user, user_from_token
from app.models.user import User
from app.schemas.auth import (
    DevLoginRequest,
    OnboardingRequest,
    ProfileUpdateRequest,
    ProvidersResponse,
    SessionResponse,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])

Provider = Literal["kakao", "naver"]

PROVIDER_CONFIG: dict[str, dict[str, str]] = {
    "kakao": {
        "auth": "https://kauth.kakao.com/oauth/authorize",
        "token": "https://kauth.kakao.com/oauth/token",
        "user": "https://kapi.kakao.com/v2/user/me",
        # 이메일은 카카오에서 선택 동의 항목이라 없을 수도 있다 — 실명·연락처는 가입 마무리 단계에서 직접 받는다.
        "scope": "account_email",
    },
    "naver": {
        "auth": "https://nid.naver.com/oauth2.0/authorize",
        "token": "https://nid.naver.com/oauth2.0/token",
        "user": "https://openapi.naver.com/v1/nid/me",
        "scope": "",
    },
}

STATE_COOKIE = "ls_oauth_state"
NEXT_COOKIE = "ls_oauth_next"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def safe_next(path: str | None) -> str:
    """로그인 후 돌아갈 경로. 사이트 내부 경로만 허용한다 — "//evil.com", "https://…", 역슬래시 등은
    외부로 튀는 오픈 리다이렉트가 되므로 홈으로 돌린다."""
    if not path or not path.startswith("/") or path.startswith("//") or "\\" in path or any(c < " " for c in path):
        return "/"
    return path


def _provider_keys(provider: str) -> tuple[str | None, str | None]:
    if provider == "kakao":
        return settings.KAKAO_CLIENT_ID, settings.KAKAO_CLIENT_SECRET
    return settings.NAVER_CLIENT_ID, settings.NAVER_CLIENT_SECRET


def _configured(provider: str) -> bool:
    client_id, secret = _provider_keys(provider)
    # 카카오는 client secret 사용을 끌 수 있어 id 만 있어도 된다. 네이버는 둘 다 필요.
    return bool(client_id) and (provider == "kakao" or bool(secret))


def _redirect_uri(provider: str) -> str:
    """각 개발자 콘솔에 이 값을 그대로 등록해야 한다."""
    return f"{settings.BACKEND_BASE_URL}{settings.API_V1_PREFIX}/auth/social/{provider}/callback"


def _frontend(path: str, **params: str) -> RedirectResponse:
    qs = f"?{urlencode(params)}" if params else ""
    return RedirectResponse(f"{settings.FRONTEND_BASE_URL}{path}{qs}", status_code=status.HTTP_302_FOUND)


def _login_success(db: Session, user: User, next_path: str) -> RedirectResponse:
    user.last_login_at = _now()
    db.commit()
    redirect = _frontend("/auth/callback", next=next_path)
    set_auth_cookies(redirect, user.id, user.token_version)
    redirect.delete_cookie(STATE_COOKIE)
    redirect.delete_cookie(NEXT_COOKIE)
    return redirect


def find_or_create_user(db: Session, provider: str, social_id: str, email: str | None) -> User:
    user = db.scalar(select(User).where(User.social_provider == provider, User.social_id == social_id))
    if user is not None:
        if not user.is_active:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="이용이 제한된 계정입니다.")
        if email and not user.email:
            user.email = email
        return user
    user = User(social_provider=provider, social_id=social_id, email=email)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ---------- 공개 정보 ----------------------------------------------------------


@router.get("/providers", response_model=ProvidersResponse)
def providers() -> ProvidersResponse:
    """로그인 화면이 어떤 버튼을 활성화할지 정할 때 쓴다."""
    return ProvidersResponse(kakao=_configured("kakao"), naver=_configured("naver"), dev=settings.dev_login_allowed)


# ---------- 소셜 로그인 --------------------------------------------------------


@router.get("/social/{provider}/login")
def social_login(provider: Provider, next: str | None = Query(default=None)) -> RedirectResponse:
    if not _configured(provider):
        return _frontend("/login", error="not_configured", provider=provider)

    client_id, _ = _provider_keys(provider)
    cfg = PROVIDER_CONFIG[provider]
    state = secrets.token_urlsafe(24)
    params = {"client_id": client_id or "", "redirect_uri": _redirect_uri(provider), "response_type": "code", "state": state}
    if cfg["scope"]:
        params["scope"] = cfg["scope"]

    response = RedirectResponse(f"{cfg['auth']}?{urlencode(params)}", status_code=status.HTTP_302_FOUND)
    # CSRF 방지용 state, 로그인 후 돌아갈 경로 — 10분 유효
    cookie = {"max_age": 600, "httponly": True, "secure": settings.COOKIE_SECURE, "samesite": "lax"}
    response.set_cookie(STATE_COOKIE, f"{provider}:{state}", **cookie)
    response.set_cookie(NEXT_COOKIE, safe_next(next), **cookie)
    return response


def _exchange_token(provider: str, code: str, state: str) -> str:
    client_id, client_secret = _provider_keys(provider)
    data = {
        "grant_type": "authorization_code",
        "client_id": client_id or "",
        "code": code,
        "redirect_uri": _redirect_uri(provider),
    }
    if client_secret:
        data["client_secret"] = client_secret
    if provider == "naver":
        data["state"] = state
    res = httpx.post(PROVIDER_CONFIG[provider]["token"], data=data, timeout=10.0)
    token = res.json().get("access_token") if res.status_code == 200 else None
    if not token:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail="소셜 로그인 인증에 실패했습니다.")
    return token


def _fetch_profile(provider: str, access_token: str) -> tuple[str, str | None]:
    """(provider 고유 id, 이메일 또는 None)"""
    res = httpx.get(PROVIDER_CONFIG[provider]["user"], headers={"Authorization": f"Bearer {access_token}"}, timeout=10.0)
    if res.status_code != 200:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail="소셜 계정 정보를 가져오지 못했습니다.")
    data = res.json()
    if provider == "kakao":
        pid = str(data.get("id") or "")
        acc = data.get("kakao_account") or {}
        # 카카오는 이메일이 있어도 미인증일 수 있다 — 인증된 경우만 저장
        email = acc.get("email") if acc.get("is_email_verified") else None
    else:
        r = data.get("response") or {}
        pid = str(r.get("id") or "")
        email = r.get("email")
    if not pid:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail="소셜 계정 정보를 가져오지 못했습니다.")
    return pid, email


@router.get("/social/{provider}/callback")
def social_callback(
    provider: Provider,
    request: Request,
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> RedirectResponse:
    if error:
        # 사용자가 동의 화면에서 취소한 경우 등
        return _frontend("/login", error="cancelled", provider=provider)
    if not _configured(provider):
        return _frontend("/login", error="not_configured", provider=provider)
    expected = request.cookies.get(STATE_COOKIE)
    if not code or not state or expected != f"{provider}:{state}":
        return _frontend("/login", error="invalid_state", provider=provider)

    try:
        token = _exchange_token(provider, code, state)
        pid, email = _fetch_profile(provider, token)
        user = find_or_create_user(db, provider, pid, email)
    except HTTPException as exc:
        return _frontend("/login", error="failed", provider=provider, message=str(exc.detail))
    return _login_success(db, user, safe_next(request.cookies.get(NEXT_COOKIE)))


# ---------- 개발용 로그인 ------------------------------------------------------


@router.post("/dev-login", response_model=UserResponse)
def dev_login(payload: DevLoginRequest, response: Response, db: Session = Depends(get_db)) -> User:
    """소셜 키 없이 로그인 흐름을 확인하기 위한 개발용 로그인. 같은 이름이면 같은 계정.
    운영 환경(ENV=production)에서는 설정과 무관하게 404 다."""
    if not settings.dev_login_allowed:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    user = find_or_create_user(db, "dev", payload.name.strip().lower(), None)
    user.last_login_at = _now()
    db.commit()
    set_auth_cookies(response, user.id, user.token_version)
    return user


# ---------- 세션 ---------------------------------------------------------------


@router.get("/session", response_model=SessionResponse)
def session(request: Request, response: Response, db: Session = Depends(get_db)) -> SessionResponse:
    """페이지를 열 때 로그인 여부를 확인하는 용도. 비로그인도 401 이 아니라 200 {user: null} 이다
    (방문할 때마다 콘솔에 401 이 찍히고 refresh 를 한 번 더 부르던 것을 없앰).
    access 가 만료됐어도 refresh 가 유효하면 여기서 바로 재발급한다 — 이 경로는 /auth 아래라 refresh 쿠키가 실려 온다."""
    user = user_from_token(db, get_access_token(request), "access")
    if user is None:
        user = user_from_token(db, get_refresh_token(request), "refresh")
        if user is not None:
            set_auth_cookies(response, user.id, user.token_version)
        elif get_access_token(request) or get_refresh_token(request):
            clear_auth_cookies(response)  # 만료·무효 쿠키 정리
    return SessionResponse(user=UserResponse.model_validate(user) if user else None)


@router.post("/refresh")
def refresh(request: Request, response: Response, db: Session = Depends(get_db)) -> dict[str, str]:
    user = user_from_token(db, get_refresh_token(request), "refresh")
    if user is None:
        clear_auth_cookies(response)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="다시 로그인해 주세요.")
    set_auth_cookies(response, user.id, user.token_version)
    return {"status": "ok"}


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)) -> dict[str, str]:
    # 토큰 버전을 올려 다른 기기·탈취된 토큰까지 함께 끊는다.
    user = user_from_token(db, get_access_token(request), "access") or user_from_token(
        db, get_refresh_token(request), "refresh"
    )
    if user is not None:
        user.token_version += 1
        db.commit()
    clear_auth_cookies(response)
    response.delete_cookie("ls_mfa", path=f"{settings.API_V1_PREFIX}/admin")
    return {"status": "ok"}


# ---------- 내 정보 ------------------------------------------------------------


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)) -> User:
    return user


@router.post("/me/onboarding", response_model=UserResponse)
def onboarding(payload: OnboardingRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    """가입 마무리: 필수 약관(이용약관·개인정보 수집이용) 동의 + 실명·연락처 + 마케팅 수신(선택)."""
    now = _now()
    user.name = payload.name
    user.phone = payload.phone
    user.terms_agreed_at = user.terms_agreed_at or now
    user.privacy_agreed_at = user.privacy_agreed_at or now
    user.marketing_consent = payload.marketing_consent
    user.marketing_consent_at = now
    user.onboarded_at = user.onboarded_at or now
    db.commit()
    db.refresh(user)
    return user


@router.patch("/me", response_model=UserResponse)
def update_me(payload: ProfileUpdateRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    if payload.name is not None:
        user.name = payload.name
    if payload.phone is not None:
        user.phone = payload.phone
        user.phone_verified_at = None  # 번호가 바뀌면 본인인증도 다시
    if payload.marketing_consent is not None and payload.marketing_consent != user.marketing_consent:
        user.marketing_consent = payload.marketing_consent
        user.marketing_consent_at = _now()
    db.commit()
    db.refresh(user)
    return user


@router.delete("/me")
def delete_me(response: Response, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict[str, str]:
    """회원 탈퇴 — 개인정보를 지우고 계정을 비활성화한다. 같은 소셜 계정으로 다시 가입할 수 있게 social_id 도 비운다.
    TODO: 사건(수임) 기록이 생기면 변호사법·세법상 보존 의무 기간 동안은 사건 기록을 별도로 보관해야 한다 —
    그때 탈퇴 처리 범위를 다시 정한다."""
    from app.models.case import OPEN_STATUSES, Case, CaseStatus

    # 진행 중 사건이 있으면 탈퇴를 막는다 — 의뢰인 계정이 사라지면 서면 수령·연락이 끊긴다
    open_cases = db.scalars(select(Case).where(Case.user_id == user.id, Case.status.in_([s.value for s in OPEN_STATUSES]))).all()
    if open_cases:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=f"진행 중인 사건이 {len(open_cases)}건 있어 탈퇴할 수 없습니다. 사건이 끝난 뒤 탈퇴하시거나 고객센터로 문의해 주세요.")
    for c in db.scalars(select(Case).where(Case.user_id == user.id, Case.status == CaseStatus.PENDING_PAYMENT)):
        c.status = CaseStatus.CANCELED
    user.is_active = False
    user.withdrawn_at = _now()
    user.social_id = f"deleted:{user.id}:{secrets.token_hex(4)}"
    user.email = user.name = user.phone = None
    user.marketing_consent = None
    user.token_version += 1
    db.commit()
    clear_auth_cookies(response)
    return {"status": "ok"}

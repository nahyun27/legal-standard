"""로그인 세션을 httpOnly 쿠키로 관리한다(KCPEC 과 같은 방식).

토큰을 응답 body 로 내려 localStorage 에 두면 XSS 한 번에 털린다 — httpOnly 쿠키는 JS 에서 읽을 수 없다.
"""

from fastapi import Request, Response

from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token

ACCESS_COOKIE = "ls_access"
REFRESH_COOKIE = "ls_refresh"
# refresh 쿠키는 /auth 경로에만 실려가게 해서 장기 토큰의 노출 표면을 줄인다.
_REFRESH_PATH = f"{settings.API_V1_PREFIX}/auth"


def set_auth_cookies(response: Response, user_id: int, token_version: int) -> None:
    common = {"httponly": True, "secure": settings.COOKIE_SECURE, "samesite": "lax"}
    response.set_cookie(
        ACCESS_COOKIE, create_access_token(user_id, token_version),
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60, path="/", **common,
    )
    response.set_cookie(
        REFRESH_COOKIE, create_refresh_token(user_id, token_version),
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600, path=_REFRESH_PATH, **common,
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(ACCESS_COOKIE, path="/")
    response.delete_cookie(REFRESH_COOKIE, path=_REFRESH_PATH)


def get_access_token(request: Request) -> str | None:
    return request.cookies.get(ACCESS_COOKIE)


def get_refresh_token(request: Request) -> str | None:
    return request.cookies.get(REFRESH_COOKIE)

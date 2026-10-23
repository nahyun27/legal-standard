from app.api import auth as auth_api
from app.core.config import settings
from app.models.user import User
from tests.conftest import ONBOARD


def login(client, name="tester"):
    r = client.post("/api/v1/auth/dev-login", json={"name": name})
    assert r.status_code == 200, r.text
    return r.json()


# ---------- 가입·로그인 --------------------------------------------------------

def test_providers_reflect_config(client):
    assert client.get("/api/v1/auth/providers").json() == {"kakao": True, "naver": False, "dev": True}


def test_me_requires_login(client):
    assert client.get("/api/v1/auth/me").status_code == 401


def test_dev_login_creates_user_not_onboarded(client):
    body = login(client)
    assert body["is_onboarded"] is False
    me = client.get("/api/v1/auth/me").json()
    assert me["id"] == body["id"] and me["social_provider"] == "dev"


def test_dev_login_same_name_same_account(client):
    a = login(client, "Kim")
    client.post("/api/v1/auth/logout")
    b = login(client, "kim ")
    assert a["id"] == b["id"]


def test_onboarding_completes_signup(client):
    login(client)
    r = client.post("/api/v1/auth/me/onboarding", json=ONBOARD)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["is_onboarded"] is True
    assert body["phone"] == "01012345678"  # 하이픈 제거해 저장
    assert body["name"] == "홍길동"


def test_onboarding_requires_mandatory_consents(client):
    login(client)
    for missing in ("agree_terms", "agree_privacy"):
        r = client.post("/api/v1/auth/me/onboarding", json={**ONBOARD, missing: False})
        assert r.status_code == 422
    assert client.get("/api/v1/auth/me").json()["is_onboarded"] is False


def test_onboarding_rejects_bad_phone_and_name(client):
    login(client)
    assert client.post("/api/v1/auth/me/onboarding", json={**ONBOARD, "phone": "02-123-4567"}).status_code == 422
    assert client.post("/api/v1/auth/me/onboarding", json={**ONBOARD, "name": " 김 "}).status_code == 422


def test_update_profile_and_marketing(client, db):
    login(client)
    client.post("/api/v1/auth/me/onboarding", json=ONBOARD)
    r = client.patch("/api/v1/auth/me", json={"phone": "01099998888", "marketing_consent": True})
    assert r.status_code == 200
    assert r.json()["phone"] == "01099998888" and r.json()["marketing_consent"] is True


# ---------- 세션 ---------------------------------------------------------------

def test_session_reports_logged_out_without_401(client):
    r = client.get("/api/v1/auth/session")
    assert r.status_code == 200 and r.json() == {"user": None}


def test_session_returns_user_and_silently_refreshes(client):
    me = login(client)
    assert client.get("/api/v1/auth/session").json()["user"]["id"] == me["id"]
    client.cookies.delete("ls_access")  # access 만료 상황
    r = client.get("/api/v1/auth/session")
    assert r.json()["user"]["id"] == me["id"]
    assert any(c.startswith("ls_access=") for c in r.headers.get_list("set-cookie"))
    assert client.get("/api/v1/auth/me").status_code == 200


def test_session_after_logout_is_null(client):
    login(client)
    old = dict(client.cookies)
    client.post("/api/v1/auth/logout")
    for k, v in old.items():
        client.cookies.set(k, v)
    assert client.get("/api/v1/auth/session").json() == {"user": None}


def test_refresh_reissues_access(client):
    login(client)
    client.cookies.delete("ls_access")
    assert client.get("/api/v1/auth/me").status_code == 401
    assert client.post("/api/v1/auth/refresh").status_code == 200
    assert client.get("/api/v1/auth/me").status_code == 200


def test_logout_revokes_old_tokens(client):
    login(client)
    stolen_access = client.cookies.get("ls_access")
    client.post("/api/v1/auth/logout")
    assert client.get("/api/v1/auth/me").status_code == 401
    # 로그아웃 전에 탈취된 토큰도 더는 통하지 않는다(token_version)
    client.cookies.set("ls_access", stolen_access)
    assert client.get("/api/v1/auth/me").status_code == 401


def test_cookies_are_httponly(client):
    r = client.post("/api/v1/auth/dev-login", json={"name": "c"})
    set_cookie = r.headers.get_list("set-cookie")
    assert any(c.startswith("ls_access=") and "HttpOnly" in c for c in set_cookie)
    assert any(c.startswith("ls_refresh=") and "Path=/api/v1/auth" in c for c in set_cookie)
    assert "ls_access" not in r.text  # 토큰이 응답 body 에 실리지 않는다


def test_delete_me_deactivates_and_allows_rejoin(client, db):
    first = login(client, "leaver")
    client.post("/api/v1/auth/me/onboarding", json=ONBOARD)
    assert client.delete("/api/v1/auth/me").status_code == 200
    assert client.get("/api/v1/auth/me").status_code == 401
    gone = db.get(User, first["id"])
    assert gone.is_active is False and gone.name is None and gone.phone is None
    again = login(client, "leaver")
    assert again["id"] != first["id"] and again["is_onboarded"] is False


# ---------- 개발용 로그인 차단 -------------------------------------------------

def test_dev_login_blocked_in_production(client, monkeypatch):
    monkeypatch.setattr(settings, "ENV", "production")
    assert client.post("/api/v1/auth/dev-login", json={"name": "x"}).status_code == 404
    assert client.get("/api/v1/auth/providers").json()["dev"] is False


def test_production_requires_strong_secret():
    import pytest
    from app.core.config import Settings

    with pytest.raises(ValueError):
        Settings(ENV="production", JWT_SECRET_KEY="please-change-me", COOKIE_SECURE=True)
    with pytest.raises(ValueError):
        Settings(ENV="production", JWT_SECRET_KEY="y" * 48, COOKIE_SECURE=False, TOSS_SECRET_KEY="sk")
    with pytest.raises(ValueError):
        Settings(ENV="production", JWT_SECRET_KEY="y" * 48, COOKIE_SECURE=True, TOSS_SECRET_KEY="")  # 시뮬레이션 결제 금지
    Settings(ENV="production", JWT_SECRET_KEY="y" * 48, COOKIE_SECURE=True, TOSS_SECRET_KEY="sk")


# ---------- 소셜 로그인 --------------------------------------------------------

def start_social(client, next_path="/intake/payment-order"):
    r = client.get("/api/v1/auth/social/kakao/login", params={"next": next_path}, follow_redirects=False)
    assert r.status_code == 302
    assert r.headers["location"].startswith("https://kauth.kakao.com/oauth/authorize?")
    state = client.cookies.get("ls_oauth_state").split(":", 1)[1]
    return state


def test_social_login_unconfigured_provider_goes_back(client):
    r = client.get("/api/v1/auth/social/naver/login", follow_redirects=False)
    assert r.status_code == 302 and "/login?error=not_configured" in r.headers["location"]


def test_social_callback_creates_user_and_returns_to_next(client, monkeypatch):
    monkeypatch.setattr(auth_api, "_exchange_token", lambda p, c, s: "provider-token")
    monkeypatch.setattr(auth_api, "_fetch_profile", lambda p, t: ("kakao-123", "a@b.com"))
    state = start_social(client)
    r = client.get("/api/v1/auth/social/kakao/callback", params={"code": "c", "state": state}, follow_redirects=False)
    assert r.status_code == 302
    assert r.headers["location"] == f"{settings.FRONTEND_BASE_URL}/auth/callback?next=%2Fintake%2Fpayment-order"
    me = client.get("/api/v1/auth/me").json()
    assert me["social_provider"] == "kakao" and me["email"] == "a@b.com"


def test_social_callback_rejects_state_mismatch(client, monkeypatch):
    monkeypatch.setattr(auth_api, "_exchange_token", lambda p, c, s: (_ for _ in ()).throw(AssertionError("must not call")))
    start_social(client)
    r = client.get("/api/v1/auth/social/kakao/callback", params={"code": "c", "state": "forged"}, follow_redirects=False)
    assert "error=invalid_state" in r.headers["location"]
    assert client.get("/api/v1/auth/me").status_code == 401


def test_same_email_other_provider_is_not_merged(client, db, monkeypatch):
    db.add(User(social_provider="naver", social_id="n-1", email="a@b.com"))
    db.commit()
    monkeypatch.setattr(auth_api, "_exchange_token", lambda p, c, s: "t")
    monkeypatch.setattr(auth_api, "_fetch_profile", lambda p, t: ("kakao-9", "a@b.com"))
    state = start_social(client)
    client.get("/api/v1/auth/social/kakao/callback", params={"code": "c", "state": state}, follow_redirects=False)
    assert client.get("/api/v1/auth/me").json()["social_provider"] == "kakao"
    assert db.query(User).count() == 2


def test_safe_next_blocks_open_redirect():
    assert auth_api.safe_next("/my") == "/my"
    assert auth_api.safe_next("/intake/x?step=3") == "/intake/x?step=3"
    for bad in (None, "", "https://evil.com", "//evil.com", "/\\evil.com", "evil", "/a\nb"):
        assert auth_api.safe_next(bad) == "/"

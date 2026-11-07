"""이메일·비밀번호 로그인 — 가입, 로그인, 잠금, 재설정, 변경, 탈퇴."""

import hashlib
import logging
import re

from app.core.passwords import hash_password, verify_password
from app.models.credentials import PasswordReset
from app.models.user import User

from tests.conftest import ONBOARD

PW = "legal-Standard-2026"
REG = "/api/v1/auth/password/register"
LOGIN = "/api/v1/auth/password/login"


def register(client, email="Client@Example.com", password=PW):
    return client.post(REG, json={"email": email, "password": password})


def test_hash_roundtrip_and_no_plaintext():
    h = hash_password(PW)
    assert h.startswith("scrypt$") and PW not in h
    assert verify_password(PW, h) and not verify_password(PW + "x", h)
    assert not verify_password(PW, None)


def test_register_logs_in_then_onboarding(client, db):
    r = register(client)
    assert r.status_code == 200, r.text
    me = r.json()
    assert me["social_provider"] == "password" and me["email"] == "client@example.com" and me["has_password"] is True
    assert me["is_onboarded"] is False
    # 같은 쿠키로 가입 마무리
    assert client.post("/api/v1/auth/me/onboarding", json=ONBOARD).status_code == 200
    u = db.query(User).one()
    assert u.password_hash and PW not in u.password_hash


def test_register_rejects_duplicate_and_weak(client):
    assert register(client).status_code == 200
    assert register(client, email="client@example.com").status_code == 409
    assert register(client, email="b@example.com", password="short").status_code == 422
    assert register(client, email="b@example.com", password="1234567890").status_code == 422
    assert register(client, email="minsu.kim@example.com", password="minsu.kim2026!").status_code == 422
    assert register(client, email="not-an-email", password=PW).status_code == 422


def test_login_generic_error_and_success(client):
    register(client)
    client.post("/api/v1/auth/logout")
    bad = client.post(LOGIN, json={"email": "client@example.com", "password": "wrong-password-1"})
    nobody = client.post(LOGIN, json={"email": "nobody@example.com", "password": PW})
    assert bad.status_code == nobody.status_code == 401 and bad.json()["detail"] == nobody.json()["detail"]
    ok = client.post(LOGIN, json={"email": " CLIENT@example.com ", "password": PW})
    assert ok.status_code == 200 and ok.json()["email"] == "client@example.com"


def test_lockout_after_five_failures(client):
    register(client)
    client.post("/api/v1/auth/logout")
    for _ in range(5):
        assert client.post(LOGIN, json={"email": "client@example.com", "password": "wrong-password-1"}).status_code == 401
    # 맞는 비밀번호여도 잠금 중에는 막는다
    assert client.post(LOGIN, json={"email": "client@example.com", "password": PW}).status_code == 429


def test_social_account_with_same_email_is_separate(client, db):
    db.add(User(social_provider="kakao", social_id="k1", email="client@example.com"))
    db.commit()
    assert register(client).status_code == 200
    assert db.query(User).count() == 2


def _reset_token(caplog, client, email="client@example.com"):
    with caplog.at_level(logging.INFO, logger="notify"):
        assert client.post("/api/v1/auth/password/forgot", json={"email": email}).json() == {"status": "ok"}
    m = re.search(r"reset-password\?token=([\w-]+)", caplog.text)
    return m.group(1) if m else None


def test_forgot_and_reset(client, db, caplog):
    register(client)
    client.post("/api/v1/auth/logout")
    # 없는 이메일도 같은 응답, 메일은 안 감
    assert _reset_token(caplog, client, "nobody@example.com") is None
    caplog.clear()
    token = _reset_token(caplog, client)
    assert token
    row = db.query(PasswordReset).one()
    assert row.token_hash == hashlib.sha256(token.encode()).hexdigest() and token not in row.token_hash
    new = "brand-New-pass-77"
    assert client.post("/api/v1/auth/password/reset", json={"token": token, "password": new}).status_code == 200
    # 한 번만 쓸 수 있다
    assert client.post("/api/v1/auth/password/reset", json={"token": token, "password": new + "x"}).status_code == 400
    assert client.post(LOGIN, json={"email": "client@example.com", "password": PW}).status_code == 401
    assert client.post(LOGIN, json={"email": "client@example.com", "password": new}).status_code == 200


def test_new_reset_link_invalidates_old(client, caplog):
    register(client)
    first = _reset_token(caplog, client)
    caplog.clear()
    second = _reset_token(caplog, client)
    assert first and second and first != second
    assert client.post("/api/v1/auth/password/reset", json={"token": first, "password": "another-Pass-55"}).status_code == 400
    assert client.post("/api/v1/auth/password/reset", json={"token": second, "password": "another-Pass-55"}).status_code == 200


def test_change_password_requires_current(client):
    register(client)
    assert client.post("/api/v1/auth/password/change", json={"current_password": "nope-nope-12", "new_password": "next-Pass-2027"}).status_code == 400
    r = client.post("/api/v1/auth/password/change", json={"current_password": PW, "new_password": "next-Pass-2027"})
    assert r.status_code == 200
    # 이 브라우저는 계속 로그인 상태
    assert client.get("/api/v1/auth/me").status_code == 200


def test_withdraw_removes_password(client, db):
    register(client)
    client.post("/api/v1/auth/me/onboarding", json=ONBOARD)
    assert client.delete("/api/v1/auth/me").status_code == 200
    u = db.query(User).one()
    assert u.password_hash is None and u.email is None
    # 같은 이메일로 다시 가입 가능
    assert register(client).status_code == 200

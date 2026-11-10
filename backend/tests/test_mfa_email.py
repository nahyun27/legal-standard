"""직원 2단계 인증 — 이메일 코드 방식(인증 앱이 없는 직원용)."""

import re

import pyotp
import pytest

from app.core import mfa
from app.core.config import settings
from tests.conftest import login_as, make_user


@pytest.fixture()
def outbox(monkeypatch):
    sent = []
    monkeypatch.setattr(mfa, "send_mail", lambda to, subject, body: sent.append((to, subject, body)) or True)
    monkeypatch.setattr(settings, "ADMIN_MFA_REQUIRED", True)
    return sent


def staff_with_email(client, db, name="변호사"):
    u = make_user(client, db, name, admin=True, lawyer=True)
    u.email = "lawyer@example.com"
    db.commit()
    return u


def last_code(outbox):
    return re.search(r"\b(\d{6})\b", outbox[-1][2]).group(1)


def test_email_mfa_enroll_and_verify(client, db, outbox):
    u = staff_with_email(client, db)
    assert client.get("/api/v1/admin/stats").json()["detail"] == "MFA_SETUP_REQUIRED"
    r = client.post("/api/v1/admin/mfa/email/send")
    assert r.status_code == 200 and r.json()["sent_to"] == "la****@example.com"
    assert outbox[-1][0] == "lawyer@example.com"
    assert client.post("/api/v1/admin/mfa/email/verify", json={"code": "000000" if last_code(outbox) != "000000" else "111111"}).status_code == 400
    assert client.post("/api/v1/admin/mfa/email/verify", json={"code": last_code(outbox)}).status_code == 200
    assert client.get("/api/v1/admin/stats").status_code == 200
    me = client.get("/api/v1/admin/me").json()
    assert me["mfa_method"] == "email" and me["mfa_enabled"] is True
    # 같은 코드는 두 번 못 쓴다
    client.post("/api/v1/auth/logout")
    login_as(client, "변호사")
    assert client.get("/api/v1/admin/stats").json()["detail"] == "MFA_REQUIRED"
    assert client.post("/api/v1/admin/mfa/email/verify", json={"code": last_code(outbox)}).status_code == 400
    client.post("/api/v1/admin/mfa/email/send")
    assert client.post("/api/v1/admin/mfa/email/verify", json={"code": last_code(outbox)}).status_code == 200
    db.refresh(u)
    assert u.mfa_email_enabled_at is not None and u.totp_enabled_at is None
    # 이메일로 등록했으면 인증 앱 등록은 막힌다(설정 화면에서 초기화 후 다시)
    assert client.post("/api/v1/admin/mfa/setup").status_code == 400


def test_email_code_new_code_replaces_old_and_attempts_limited(client, db, outbox):
    staff_with_email(client, db)
    client.post("/api/v1/admin/mfa/email/send")
    first = last_code(outbox)
    client.post("/api/v1/admin/mfa/email/send")
    second = last_code(outbox)
    if first != second:
        assert client.post("/api/v1/admin/mfa/email/verify", json={"code": first}).status_code == 400
    wrong = "123456" if second != "123456" else "654321"
    codes = [client.post("/api/v1/admin/mfa/email/verify", json={"code": wrong}).status_code for _ in range(6)]
    assert codes[-1] == 429
    # 5번 틀린 뒤에는 맞는 코드도 소용없다 — 새로 받아야 한다
    assert client.post("/api/v1/admin/mfa/email/verify", json={"code": second}).status_code == 429


def test_email_sends_rate_limited(client, db, outbox):
    staff_with_email(client, db)
    codes = [client.post("/api/v1/admin/mfa/email/send").status_code for _ in range(6)]
    assert codes[:5] == [200] * 5 and codes[5] == 429


def test_totp_users_cannot_fall_back_to_email(client, db, outbox):
    staff_with_email(client, db)
    setup = client.post("/api/v1/admin/mfa/setup").json()
    assert client.post("/api/v1/admin/mfa/enable", json={"code": pyotp.TOTP(setup["secret"]).now()}).status_code == 200
    assert client.post("/api/v1/admin/mfa/email/send").status_code == 400
    assert client.post("/api/v1/admin/mfa/email/verify", json={"code": "123456"}).status_code == 400


def test_email_mfa_needs_smtp_in_production(client, db, outbox, monkeypatch):
    staff_with_email(client, db)
    monkeypatch.setattr(settings, "ENV", "production")
    monkeypatch.setattr(settings, "SMTP_HOST", None)
    assert client.post("/api/v1/admin/mfa/email/send").status_code == 503

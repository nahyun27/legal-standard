"""개선 항목(결제 누락 대조·KST·탈퇴 차단·동의·공휴일·이해충돌·한도·검수시간·견적·인용·MFA·리마인드·지표) 테스트."""

import io
from datetime import date, datetime, timedelta, timezone

import pyotp

from app import cli
from app.api import cases as cases_api
from app.core import citations
from app.core.config import settings
from app.core.conflict import name_key
from app.core.timeutil import KST, add_business_days, kst_day_start
from app.models.case import Case, Payment
from app.models.ops import Notification
from tests.conftest import login_as, make_user
from tests.test_cases import CONSENT, INTAKE, new_case, pay


def staff(client, db, name="변호사", admin=True):
    return make_user(client, db, name, admin=admin, lawyer=True)


# ---------- 1. 결제 누락 대조(웹훅·reconcile) --------------------------------


def real_mode(monkeypatch):
    monkeypatch.setattr(settings, "TOSS_SECRET_KEY", "test_sk_dummy")


def test_webhook_applies_payment_after_refetch(client, db, monkeypatch):
    make_user(client, db, "고객")
    c = new_case(client)
    real_mode(monkeypatch)
    start = client.post(f"/api/v1/cases/{c['id']}/payment", json=CONSENT).json()
    assert start["simulated"] is False
    seen = {}

    def fake_get(order_id):
        seen["order"] = order_id
        return {"status": "DONE", "paymentKey": "pk_1", "totalAmount": start["amount"], "method": "카드", "receipt": {"url": "https://r/1"}}

    monkeypatch.setattr(cases_api.toss, "get_by_order", fake_get)
    # 본문에 status 를 DONE 으로 써 보내도 그대로 믿지 않고 토스에 다시 조회한다
    r = client.post("/api/v1/payments/webhook", json={"eventType": "PAYMENT_STATUS_CHANGED", "data": {"orderId": start["order_id"], "status": "DONE"}})
    assert r.status_code == 200 and seen["order"] == start["order_id"]
    body = client.get(f"/api/v1/cases/{c['id']}").json()
    assert body["status"] == "reviewing" and body["receipt_url"] == "https://r/1"


def test_webhook_rejects_amount_mismatch(client, db, monkeypatch):
    make_user(client, db, "고객")
    c = new_case(client)
    real_mode(monkeypatch)
    start = client.post(f"/api/v1/cases/{c['id']}/payment", json=CONSENT).json()
    monkeypatch.setattr(cases_api.toss, "get_by_order", lambda o: {"status": "DONE", "paymentKey": "pk", "totalAmount": 100})
    client.post("/api/v1/payments/webhook", json={"data": {"orderId": start["order_id"]}})
    assert client.get(f"/api/v1/cases/{c['id']}").json()["status"] == "pending_payment"


def test_reconcile_picks_up_closed_window(client, db, monkeypatch):
    make_user(client, db, "고객")
    c = new_case(client)
    real_mode(monkeypatch)
    start = client.post(f"/api/v1/cases/{c['id']}/payment", json=CONSENT).json()
    p = db.query(Payment).filter_by(order_id=start["order_id"]).one()
    p.created_at = datetime.now(timezone.utc) - timedelta(minutes=30)
    db.commit()
    monkeypatch.setattr(cases_api.toss, "get_by_order", lambda o: {"status": "DONE", "paymentKey": "pk", "totalAmount": start["amount"]})
    assert cli.reconcile_payments(db) == {"paid": 1}
    db.refresh(p)
    assert p.status == "done" and p.case.status == "reviewing"


# ---------- 2. 대시보드 "오늘"은 한국 날짜 ------------------------------------


def test_today_revenue_uses_kst(client, db):
    make_user(client, db, "고객")
    c = new_case(client)
    pay(client, c["id"])
    p = db.query(Payment).filter_by(case_id=c["id"]).filter(Payment.status == "done").one()
    # 한국 시각 오늘 오전 8시 = UTC 로는 어제 23시. UTC 자정 기준이면 "어제"로 빠진다.
    p.approved_at = kst_day_start() + timedelta(hours=8)
    db.commit()
    staff(client, db)
    assert client.get("/api/v1/admin/stats").json()["revenue"]["today"] == p.amount


# ---------- 3. 진행 중 사건이 있으면 탈퇴 불가 ---------------------------------


def test_withdraw_blocked_with_open_case(client, db):
    make_user(client, db, "고객")
    c = new_case(client)
    pay(client, c["id"])
    r = client.delete("/api/v1/auth/me")
    assert r.status_code == 409


def test_withdraw_cancels_pending_payment(client, db):
    make_user(client, db, "고객")
    c = new_case(client)
    assert client.delete("/api/v1/auth/me").status_code == 200
    assert db.get(Case, c["id"]).status == "canceled"


# ---------- 4. 결제 전 동의 ---------------------------------------------------


def test_payment_requires_consents_and_records_version(client, db):
    make_user(client, db, "고객")
    c = new_case(client)
    assert client.post(f"/api/v1/cases/{c['id']}/payment", json={"agree_engagement": True, "agree_withdrawal": False}).status_code == 422
    assert client.post(f"/api/v1/cases/{c['id']}/payment").status_code == 422
    pay(client, c["id"])
    consents = db.get(Case, c["id"]).consents
    assert consents["version"] == settings.CONSENT_VERSION and "청약철회" in consents["items"]["agree_withdrawal"]
    assert client.get("/api/v1/consents/payment").json()["version"] == settings.CONSENT_VERSION


# ---------- 5. 알림 기록 ------------------------------------------------------


def test_notification_logged_even_without_channel(client, db):
    make_user(client, db, "고객")
    c = new_case(client)
    pay(client, c["id"])
    n = db.query(Notification).filter_by(case_id=c["id"], event="paid").one()
    assert n.status == "skipped" and n.channel == "log"


# ---------- 7. 공휴일 반영 납기 ------------------------------------------------


def test_business_days_skip_chuseok_2026():
    # 2026-09-23(수) 접수 + 3영업일: 9/24·25·26 추석, 9/27 일 → 9/28·29·30 → 9/30
    start = datetime(2026, 9, 23, 3, 0, tzinfo=timezone.utc)
    assert add_business_days(start, 3).astimezone(KST).date() == date(2026, 9, 30)


# ---------- 8. 다음 단계 이어서 신청 -------------------------------------------


def test_followup_case_links_parent_and_counts_conversion(client, db):
    make_user(client, db, "고객")
    first = new_case(client, service_slug="certified-letter")
    pay(client, first["id"])
    second = new_case(client, parent_case_id=first["id"])
    assert second["parent_case_id"] == first["id"]
    pay(client, second["id"])
    make_user(client, db, "남")
    assert client.post("/api/v1/cases", json={**INTAKE, "parent_case_id": first["id"]}).status_code == 404  # 남의 사건은 못 잇는다
    staff(client, db)
    assert client.get("/api/v1/admin/stats").json()["kpi"]["followups"] == 1


# ---------- 10. 결제 대기 리마인드·자동 취소 -----------------------------------


def test_housekeeping_reminds_once_then_expires(client, db):
    make_user(client, db, "고객")
    c = new_case(client)
    case = db.get(Case, c["id"])
    case.updated_at = datetime.now(timezone.utc) - timedelta(hours=30)
    db.commit()
    assert cli.housekeeping(db) == {"reminded": 1, "expired": 0}
    assert cli.housekeeping(db)["reminded"] == 0  # 한 번만
    case.updated_at = datetime.now(timezone.utc) - timedelta(days=8)
    db.commit()
    assert cli.housekeeping(db)["expired"] == 1
    assert db.get(Case, c["id"]).status == "canceled"


# ---------- 13. 관리자 2단계 인증 -----------------------------------------------


def test_admin_requires_mfa_when_enabled(client, db, monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_MFA_REQUIRED", True)
    u = staff(client, db)
    assert client.get("/api/v1/admin/stats").json()["detail"] == "MFA_SETUP_REQUIRED"
    assert client.get("/api/v1/admin/me").json()["mfa_enabled"] is False
    setup = client.post("/api/v1/admin/mfa/setup").json()
    assert setup["qr_svg"].startswith("data:image/svg+xml;base64,")
    assert client.post("/api/v1/admin/mfa/enable", json={"code": "000000"}).status_code == 400
    code = pyotp.TOTP(setup["secret"]).now()
    assert client.post("/api/v1/admin/mfa/enable", json={"code": code}).status_code == 200
    assert client.get("/api/v1/admin/stats").status_code == 200
    # 로그아웃하면 2단계 인증 쿠키도 무효 — 다시 로그인하면 코드를 다시 요구한다
    client.post("/api/v1/auth/logout")
    login_as(client, "변호사")
    assert client.get("/api/v1/admin/stats").json()["detail"] == "MFA_REQUIRED"
    assert client.post("/api/v1/admin/mfa/verify", json={"code": pyotp.TOTP(setup["secret"]).now()}).status_code == 200
    assert client.get("/api/v1/admin/users").status_code == 200
    db.refresh(u)
    assert u.totp_enabled_at is not None


def test_mfa_rate_limited(client, db, monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_MFA_REQUIRED", True)
    staff(client, db, "잠금변호사")
    setup = client.post("/api/v1/admin/mfa/setup").json()
    client.post("/api/v1/admin/mfa/enable", json={"code": pyotp.TOTP(setup["secret"]).now()})
    codes = [client.post("/api/v1/admin/mfa/verify", json={"code": "111111"}).status_code for _ in range(6)]
    assert codes[-1] == 429


# ---------- 14. 이해충돌 정규화·법인 명단 --------------------------------------


def test_name_key_normalizes_corporate_forms():
    assert name_key("(주) 상대 상사") == name_key("상대상사 주식회사") == name_key("㈜상대상사") == "상대상사"
    assert name_key("") is None


def test_conflict_normalized_and_firm_list(client, db):
    make_user(client, db, "고객")
    a = new_case(client, opponent_name="(주)상대상사")
    pay(client, a["id"])
    make_user(client, db, "다른고객")
    b = new_case(client, service_slug="certified-letter", opponent_name="상대상사 주식회사")
    pay(client, b["id"])
    staff(client, db)
    csv_bytes = "이름,구분,메모\n상대상사,의뢰인,2025가단1234 사건 의뢰인\n".encode("cp949")
    r = client.post("/api/v1/admin/conflict-list", files={"file": ("명단.csv", io.BytesIO(csv_bytes), "text/csv")})
    assert r.status_code == 200 and r.json()["count"] == 1
    kinds = [x["kind"] for x in client.get(f"/api/v1/admin/cases/{b['id']}").json()["conflicts"]]
    assert "같은 상대방의 다른 사건" in kinds and any(k.startswith("법인 명단의 의뢰인") for k in kinds)


# ---------- 15·16. 실제 검수시간·처리 한도 --------------------------------------


def test_review_time_measured_from_lawyer_open(client, db):
    make_user(client, db, "고객")
    c = new_case(client)
    pay(client, c["id"])
    lawyer = staff(client, db)
    client.post(f"/api/v1/admin/cases/{c['id']}/accept", json={"lawyer_id": lawyer.id, "conflict_checked": True})
    client.post(f"/api/v1/admin/cases/{c['id']}/files", data={"kind": "document"}, files={"file": ("a.pdf", io.BytesIO(b"x"), "application/pdf")})
    client.post(f"/api/v1/admin/cases/{c['id']}/submit-review")
    detail = client.get(f"/api/v1/admin/cases/{c['id']}").json()  # 변호사가 처음 연 시각
    case = db.get(Case, c["id"])
    db.refresh(case)
    assert case.review_started_at is not None
    case.review_started_at = datetime.now(timezone.utc) - timedelta(minutes=40)
    db.commit()
    client.post(f"/api/v1/admin/cases/{c['id']}/approve", json={"checklist": detail["checklist"]})
    db.refresh(case)
    assert 39 * 60 <= case.review_seconds <= 41 * 60
    assert client.get("/api/v1/admin/stats").json()["kpi"]["avg_review_minutes"] is not None


def test_lawyer_open_case_limit(client, db, monkeypatch):
    monkeypatch.setattr(settings, "MAX_OPEN_CASES_PER_LAWYER", 1)
    make_user(client, db, "고객")
    a = new_case(client)
    pay(client, a["id"])
    b = new_case(client, service_slug="certified-letter")
    pay(client, b["id"])
    lawyer = staff(client, db)
    assert client.post(f"/api/v1/admin/cases/{a['id']}/accept", json={"lawyer_id": lawyer.id, "conflict_checked": True}).status_code == 200
    r = client.post(f"/api/v1/admin/cases/{b['id']}/accept", json={"lawyer_id": lawyer.id, "conflict_checked": True})
    assert r.status_code == 409 and "한도" in r.json()["detail"]


# ---------- 17. 심화 사건 견적 → 결제 ------------------------------------------


def test_quote_flow_for_advanced_case(client, db):
    make_user(client, db, "고객")
    c = new_case(client, service_slug="advanced", claim_amount=None)
    assert c["status"] == "reviewing" and c["total"] == 0
    staff(client, db)
    r = client.post(f"/api/v1/admin/cases/{c['id']}/quote", json={"fee": 1_500_000, "note": "가압류 포함 개별 수임"})
    assert r.status_code == 200
    login_as(client, "고객")
    body = client.get(f"/api/v1/cases/{c['id']}").json()
    assert body["status"] == "pending_payment" and body["total"] == 1_650_000 and body["quote_note"]
    assert pay(client, c["id"]).json()["status"] == "reviewing"


# ---------- 20. 인용 확인 ------------------------------------------------------


def test_citations_unknown_without_api_key(client, db):
    assert citations.extract("대법원 2019다12345 판결 및 민법 제750조")[0]["ref"] == "2019다12345"
    make_user(client, db, "고객")
    c = new_case(client)
    pay(client, c["id"])
    staff(client, db)
    r = client.post(f"/api/v1/admin/cases/{c['id']}/citations", json={"text": "대법원 2019다12345 판결, 민법 제750조"}).json()
    assert r["api_configured"] is False and all(i["status"] == "unknown" for i in r["items"]) and len(r["items"]) == 2


def test_citations_use_api_result(monkeypatch):
    monkeypatch.setattr(settings, "LAW_API_OC", "oc")
    monkeypatch.setattr(citations, "_search", lambda target, q: 0 if q == "2099다1" else 1)
    out = {i["ref"]: i["status"] for i in citations.check("2099다1 과 2019다12345, 민법 제750조")}
    assert out == {"2099다1": "not_found", "2019다12345": "found", "민법 제750조": "found"}


# ---------- 21. 실측 지표 공개 -------------------------------------------------


def test_public_metrics_hidden_until_threshold(client, db, monkeypatch):
    assert client.get("/api/v1/public/metrics").json() == {"available": False}
    monkeypatch.setattr(settings, "PUBLIC_METRICS_MIN_CASES", 1)
    make_user(client, db, "고객")
    c = new_case(client)
    pay(client, c["id"])
    case = db.get(Case, c["id"])
    t = datetime.now(timezone.utc)
    case.status, case.accepted_at, case.delivered_at, case.due_at = "delivered", t - timedelta(days=3), t, t + timedelta(days=1)
    db.commit()
    m = client.get("/api/v1/public/metrics").json()
    assert m["available"] is True and m["delivered"] == 1 and m["on_time_rate"] == 100

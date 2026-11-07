"""관리자 통계 리포트·주문(결제) 목록."""

from tests.conftest import make_user
from tests.test_cases import new_case, pay


def _two_paid_one_refunded(client, db):
    make_user(client, db, "고객")
    a = new_case(client)
    pay(client, a["id"])
    b = new_case(client, service_slug="certified-letter", track="self", claim_amount=3_000_000)
    pay(client, b["id"])
    make_user(client, db, "변호사", lawyer=True)
    assert client.post(f"/api/v1/admin/cases/{b['id']}/reject", json={"reason": "범위를 넘는 사건"}).status_code == 200
    return a, b


def test_reports_are_admin_only(client, db):
    make_user(client, db, "변호사", lawyer=True)
    assert client.get("/api/v1/admin/stats/report").status_code in (403, 404)
    assert client.get("/api/v1/admin/payments").status_code in (403, 404)


def test_stats_report_totals_and_breakdowns(client, db):
    a, b = _two_paid_one_refunded(client, db)
    make_user(client, db, "관리자", admin=True)
    r = client.get("/api/v1/admin/stats/report", params={"days": 30})
    assert r.status_code == 200, r.text
    d = r.json()
    t = d["totals"]
    assert t["gross"] == a["total"] + b["total"] and t["refunds"] == b["total"] and t["net"] == a["total"]
    assert t["paid_cases"] == 2 and t["rejected"] == 1 and t["signups"] >= 3
    assert d["unit"] == "day" and len(d["series"]) == 30
    assert sum(s["revenue"] for s in d["series"]) == t["gross"] and sum(s["refunds"] for s in d["series"]) == t["refunds"]
    assert {r["slug"] for r in d["by_service"]} == {"payment-order", "certified-letter"}
    assert {r["track"]: r["count"] for r in d["by_track"]} == {"self": 1, "atty": 1}
    funnel = {f["key"]: f["count"] for f in d["funnel"]}
    assert funnel["created"] == 2 and funnel["paid"] == 2 and funnel["accepted"] == 0
    # 기간이 길면 주·월 단위로 묶는다
    assert client.get("/api/v1/admin/stats/report", params={"days": 90}).json()["unit"] == "week"
    assert client.get("/api/v1/admin/stats/report", params={"days": 365}).json()["unit"] == "month"


def test_payments_list_filters_and_summary(client, db):
    a, b = _two_paid_one_refunded(client, db)
    make_user(client, db, "관리자", admin=True)
    d = client.get("/api/v1/admin/payments").json()
    assert d["total"] == 2
    assert d["summary"]["done"]["amount"] == a["total"] and d["summary"]["canceled"]["amount"] == b["total"]
    row = next(i for i in d["items"] if i["case_id"] == a["id"])
    assert row["kind"] == "case" and row["status_label"] == "결제 완료" and row["client_name"] == "의뢰인"
    assert client.get("/api/v1/admin/payments", params={"status": "canceled"}).json()["total"] == 1
    assert client.get("/api/v1/admin/payments", params={"kind": "charge"}).json()["total"] == 0
    assert client.get("/api/v1/admin/payments", params={"q": "내용증명"}).json()["total"] == 1

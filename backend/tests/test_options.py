"""2단계: 개수 단위(고소사실)·정찰가 수임 조건(피의사건)·장수 구간(계약서)·전자 수임약정·추가 요금 청구."""

import io

from tests.conftest import login_as, make_user
from tests.test_cases import CONSENT, INTAKE, new_case, pay

COMPLAINT = {**INTAKE, "service_slug": "complaint", "claim_amount": None}
DEFENSE = {**INTAKE, "service_slug": "suspect-defense", "track": "opinion", "claim_amount": None,
           "screening": {"confession": "예", "charges": "1개", "custody": "아니오"}}


def test_units_multiply_fee_and_have_a_cap(client, db):
    make_user(client, db, "고객")
    c = new_case(client, **COMPLAINT, units=2)
    assert c["fee"] == 960_000 and c["units"] == 2 and c["service_name"] == "형사 고소장 · 변호사에게 맡기기 · 고소사실 2개"
    assert client.post("/api/v1/cases", json={**COMPLAINT, "units": 6}).status_code == 422
    # 개수 단위가 없는 상품은 개수를 무시한다
    assert new_case(client, units=3)["units"] == 1


def test_screening_blocks_contested_defense(client, db):
    make_user(client, db, "고객")
    bad = {**DEFENSE, "screening": {**DEFENSE["screening"], "confession": "아니오"}}
    r = client.post("/api/v1/cases", json=bad)
    assert r.status_code == 422 and "심화 사건 상담" in r.json()["detail"]
    assert client.post("/api/v1/cases", json={**DEFENSE, "screening": {}}).status_code == 422
    c = new_case(client, **DEFENSE)
    assert c["fee"] == 1_100_000 and c["service_name"] == "피의사건 정찰 변호 · 수사단계 의견서"
    assert c["retainer"]["required"] is True


def test_contract_review_page_bands(client, db):
    q = client.get("/api/v1/catalog/quote", params={"service": "contract-review", "track": "p10"}).json()
    assert q["fee"] == 150_000 and q["service_name"] == "계약서 검토 · 6~10장"
    assert client.get("/api/v1/catalog/quote", params={"service": "contract-review", "track": "atty"}).status_code == 422
    make_user(client, db, "고객")
    c = new_case(client, **{**INTAKE, "service_slug": "contract-review", "track": "p5", "claim_amount": None})
    assert c["retainer"] is None  # 검토 의견만 드리는 상품이라 수임약정이 없다


def accepted(client, db, **over):
    make_user(client, db, "고객")
    c = new_case(client, **over)
    pay(client, c["id"])
    lawyer = make_user(client, db, "변호사", lawyer=True)
    assert client.post(f"/api/v1/admin/cases/{c['id']}/accept", json={"lawyer_id": lawyer.id, "conflict_checked": True}).status_code == 200
    return c


def test_retainer_must_be_signed_before_approval(client, db):
    c = accepted(client, db)
    client.post(f"/api/v1/admin/cases/{c['id']}/files", data={"kind": "document"}, files={"file": ("a.pdf", io.BytesIO(b"D"), "application/pdf")})
    client.post(f"/api/v1/admin/cases/{c['id']}/submit-review")
    checklist = client.get(f"/api/v1/admin/cases/{c['id']}").json()["checklist"]
    assert client.post(f"/api/v1/admin/cases/{c['id']}/approve", json={"checklist": checklist}).status_code == 409

    login_as(client, "고객")
    doc = client.get(f"/api/v1/cases/{c['id']}/retainer").json()
    assert "수임약정서" in doc["text"] and "250,000원" in doc["text"]
    wrong = client.post(f"/api/v1/cases/{c['id']}/retainer", json={"name": "다른사람", "agree": True, "sha256": doc["sha256"]})
    assert wrong.status_code == 422
    stale = client.post(f"/api/v1/cases/{c['id']}/retainer", json={"name": INTAKE["client_name"], "agree": True, "sha256": "0" * 64})
    assert stale.status_code == 409
    ok = client.post(f"/api/v1/cases/{c['id']}/retainer", json={"name": INTAKE["client_name"], "agree": True, "sha256": doc["sha256"]})
    assert ok.status_code == 200 and ok.json()["retainer"]["signed_at"]

    login_as(client, "변호사")
    assert client.post(f"/api/v1/admin/cases/{c['id']}/approve", json={"checklist": checklist}).status_code == 200


def test_retainer_only_after_acceptance_and_only_for_atty(client, db):
    make_user(client, db, "고객")
    c = new_case(client)
    doc = client.get(f"/api/v1/cases/{c['id']}/retainer").json()
    early = client.post(f"/api/v1/cases/{c['id']}/retainer", json={"name": INTAKE["client_name"], "agree": True, "sha256": doc["sha256"]})
    assert early.status_code == 400  # 수임 확정 전에는 서명할 수 없다
    self_case = new_case(client, service_slug="certified-letter", track="self")
    assert client.get(f"/api/v1/cases/{self_case['id']}/retainer").status_code == 404


def test_extra_charge_flow(client, db):
    c = accepted(client, db, **COMPLAINT)
    url = f"/api/v1/admin/cases/{c['id']}/charges"
    assert client.post(url, json={"addon": "police-appearance", "option": "제주", "note": "조사 출석"}).status_code == 400
    assert client.post(url, json={"addon": "court-appearance", "option": "수도권", "note": "기일"}).status_code == 400
    r = client.post(url, json={"addon": "police-appearance", "option": "수도권", "note": "11/20(목) 14:00 서초경찰서"})
    assert r.status_code == 200 and r.json()["total"] == 770_000
    ch = r.json()

    make_user(client, db, "직원", admin=True)
    assert client.post(url, json={"addon": "police-appearance", "option": "수도권", "note": "직원 시도"}).status_code == 403

    login_as(client, "고객")
    body = client.get(f"/api/v1/cases/{c['id']}").json()
    assert [x["id"] for x in body["charges"]] == [ch["id"]]
    start = client.post(f"/api/v1/cases/{c['id']}/charges/{ch['id']}/payment", json=CONSENT).json()
    assert start["amount"] == 770_000
    assert client.post("/api/v1/payments/confirm", json={"order_id": start["order_id"], "payment_key": "x", "amount": 1}).status_code == 400
    done = client.post("/api/v1/payments/confirm", json={"order_id": start["order_id"], "payment_key": "x", "amount": 770_000}).json()
    assert done["status"] == "in_progress"  # 사건 단계는 그대로
    assert done["charges"][0]["status"] == "paid"
    again = client.post(f"/api/v1/cases/{c['id']}/charges/{ch['id']}/payment", json=CONSENT)
    assert again.status_code == 400


def test_pending_charge_can_be_canceled(client, db):
    c = accepted(client, db, **COMPLAINT)
    ch = client.post(f"/api/v1/admin/cases/{c['id']}/charges", json={"addon": "police-appearance", "option": "비수도권", "note": "기일 변경 전"}).json()
    r = client.post(f"/api/v1/admin/cases/{c['id']}/charges/{ch['id']}/cancel", json={"reason": "기일 취소"})
    assert r.status_code == 200 and r.json()["status"] == "canceled"
    login_as(client, "고객")
    assert client.get(f"/api/v1/cases/{c['id']}").json()["charges"] == []

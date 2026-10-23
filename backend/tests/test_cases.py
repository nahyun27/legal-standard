import io

from app.models.case import Case
from tests.conftest import login_as, make_user

INTAKE = {
    "service_slug": "payment-order", "client_name": "의뢰인", "phone": "010-2222-3333",
    "opponent_name": "상대회사", "claim_amount": 5_000_000, "facts": "3월에 빌려줌",
}


def new_case(client, **over):
    r = client.post("/api/v1/cases", json={**INTAKE, **over})
    assert r.status_code == 200, r.text
    return r.json()


def pay(client, case_id, amount=None):
    start = client.post(f"/api/v1/cases/{case_id}/payment").json()
    assert start["simulated"] is True
    return client.post("/api/v1/payments/confirm", json={"order_id": start["order_id"], "payment_key": "x", "amount": amount or start["amount"]})


def test_quote_is_public(client):
    r = client.get("/api/v1/catalog/quote", params={"service": "payment-order", "claim_amount": 5_000_000})
    assert r.status_code == 200 and r.json()["total"] == 277_200


def test_case_requires_onboarding(client, db):
    make_user(client, db, "미가입자", onboard=False)
    assert client.post("/api/v1/cases", json=INTAKE).status_code == 403


def test_create_case_uses_server_price_and_reuses_pending(client, db):
    make_user(client, db, "고객")
    a = new_case(client)
    assert a["status"] == "pending_payment" and a["total"] == 277_200
    b = new_case(client, facts="수정한 내용")
    assert a["id"] == b["id"]  # 같은 상품의 결제 대기 사건은 덮어쓴다
    assert b["intake"]["facts"] == "수정한 내용"


def test_claim_amount_required_for_money_products(client, db):
    make_user(client, db, "고객")
    assert client.post("/api/v1/cases", json={**INTAKE, "claim_amount": None}).status_code == 422


def test_payment_rejects_tampered_amount(client, db):
    make_user(client, db, "고객")
    c = new_case(client)
    r = pay(client, c["id"], amount=1_000)
    assert r.status_code == 400
    assert client.get(f"/api/v1/cases/{c['id']}").json()["status"] == "pending_payment"


def test_simulated_payment_moves_to_review(client, db):
    make_user(client, db, "고객")
    c = new_case(client)
    r = pay(client, c["id"])
    assert r.status_code == 200 and r.json()["status"] == "reviewing"


def test_cannot_see_others_case(client, db):
    make_user(client, db, "고객A")
    c = new_case(client)
    make_user(client, db, "고객B")
    assert client.get(f"/api/v1/cases/{c['id']}").status_code == 404
    assert client.post(f"/api/v1/cases/{c['id']}/payment").status_code == 404


def test_cancel_only_before_payment(client, db):
    make_user(client, db, "고객")
    c = new_case(client)
    pay(client, c["id"])
    assert client.post(f"/api/v1/cases/{c['id']}/cancel").status_code == 400


def test_evidence_upload_and_type_check(client, db):
    make_user(client, db, "고객")
    c = new_case(client)
    ok = client.post(f"/api/v1/cases/{c['id']}/files", files={"file": ("차용증.pdf", io.BytesIO(b"%PDF-1"), "application/pdf")})
    assert ok.status_code == 200
    bad = client.post(f"/api/v1/cases/{c['id']}/files", files={"file": ("virus.exe", io.BytesIO(b"MZ"), "application/octet-stream")})
    assert bad.status_code == 400
    fid = ok.json()["id"]
    assert client.get(f"/api/v1/files/{fid}").content == b"%PDF-1"


def full_flow_until_review(client, db):
    """고객 접수·결제 → 변호사 수임 확정 → 서면 업로드 → 검수 요청."""
    make_user(client, db, "고객")
    c = new_case(client)
    pay(client, c["id"])
    lawyer = make_user(client, db, "변호사", lawyer=True)
    r = client.post(f"/api/v1/admin/cases/{c['id']}/accept", json={"lawyer_id": lawyer.id, "conflict_checked": True})
    assert r.status_code == 200, r.text
    up = client.post(f"/api/v1/admin/cases/{c['id']}/files", data={"kind": "document"}, files={"file": ("지급명령신청서.pdf", io.BytesIO(b"DRAFT"), "application/pdf")})
    assert up.status_code == 200, up.text
    assert client.post(f"/api/v1/admin/cases/{c['id']}/submit-review").status_code == 200
    return c, lawyer, up.json()["id"]


def test_customer_cannot_download_document_before_delivery(client, db):
    c, lawyer, doc_id = full_flow_until_review(client, db)
    login_as(client, "고객")
    assert client.get(f"/api/v1/files/{doc_id}").status_code == 404
    assert all(f["kind"] == "evidence" for f in client.get(f"/api/v1/cases/{c['id']}").json()["files"])


def test_approve_requires_full_checklist_and_lawyer(client, db):
    c, lawyer, doc_id = full_flow_until_review(client, db)
    detail = client.get(f"/api/v1/admin/cases/{c['id']}").json()
    assert client.post(f"/api/v1/admin/cases/{c['id']}/approve", json={"checklist": detail["checklist"][:1]}).status_code == 400
    # 변호사가 아닌 관리자는 검수 완료 불가
    make_user(client, db, "관리자", admin=True)
    assert client.post(f"/api/v1/admin/cases/{c['id']}/approve", json={"checklist": detail["checklist"]}).status_code == 403
    login_as(client, "변호사")
    assert client.post(f"/api/v1/admin/cases/{c['id']}/approve", json={"checklist": detail["checklist"]}).status_code == 200


def test_document_frozen_after_review_and_delivered_to_customer(client, db):
    c, lawyer, doc_id = full_flow_until_review(client, db)
    checklist = client.get(f"/api/v1/admin/cases/{c['id']}").json()["checklist"]
    client.post(f"/api/v1/admin/cases/{c['id']}/approve", json={"checklist": checklist})
    # 검수 승인 후에는 서면을 바꿔치기할 수 없다
    swap = client.post(f"/api/v1/admin/cases/{c['id']}/files", data={"kind": "document"}, files={"file": ("x.pdf", io.BytesIO(b"SWAP"), "application/pdf")})
    assert swap.status_code == 409
    assert client.post(f"/api/v1/admin/cases/{c['id']}/deliver", json={"note": "전자소송 접수번호 2026차전1234"}).status_code == 200
    login_as(client, "고객")
    body = client.get(f"/api/v1/cases/{c['id']}").json()
    assert body["status"] == "delivered" and any(f["id"] == doc_id for f in body["files"])
    assert client.get(f"/api/v1/files/{doc_id}").content == b"DRAFT"


def test_reject_refunds_payment(client, db):
    make_user(client, db, "고객")
    c = new_case(client)
    pay(client, c["id"])
    make_user(client, db, "변호사", lawyer=True)
    r = client.post(f"/api/v1/admin/cases/{c['id']}/reject", json={"reason": "표준 범위를 넘는 고액 사건"})
    assert r.status_code == 200
    case = db.get(Case, c["id"])
    db.refresh(case)
    assert case.status == "rejected" and all(p.status == "canceled" for p in case.payments if p.approved_at)


def test_conflict_candidates(client, db):
    make_user(client, db, "고객")
    first = new_case(client)
    pay(client, first["id"])
    make_user(client, db, "다른고객")
    second = new_case(client, service_slug="certified-letter", opponent_name="상대회사")
    pay(client, second["id"])
    make_user(client, db, "변호사", lawyer=True)
    kinds = [x["kind"] for x in client.get(f"/api/v1/admin/cases/{second['id']}").json()["conflicts"]]
    assert "같은 상대방의 다른 사건" in kinds

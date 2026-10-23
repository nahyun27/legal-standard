from app.models.audit import AuditLog
from tests.conftest import login_as, make_user


def test_admin_hidden_from_customers(client, db):
    make_user(client, db, "고객")
    for path in ("/api/v1/admin/stats", "/api/v1/admin/users", "/api/v1/admin/cases"):
        assert client.get(path).status_code == 404


def test_lawyer_can_handle_cases_but_not_users(client, db):
    make_user(client, db, "변호사", lawyer=True)
    assert client.get("/api/v1/admin/cases").status_code == 200
    assert client.get("/api/v1/admin/users").status_code == 404


def test_user_search_masks_phone_and_detail_is_logged(client, db):
    target = make_user(client, db, "홍길동")
    admin = make_user(client, db, "관리자", admin=True)
    rows = client.get("/api/v1/admin/users", params={"q": "홍길"}).json()["items"]
    assert rows[0]["phone"] == "010-****-5678"
    detail = client.get(f"/api/v1/admin/users/{target.id}").json()
    assert detail["phone"] == "01012345678"
    assert db.query(AuditLog).filter_by(action="user.view", actor_id=admin.id, target_id=target.id).count() == 1


def test_suspend_kicks_out_and_blocks_login(client, db):
    target = make_user(client, db, "문제회원")
    make_user(client, db, "관리자", admin=True)
    assert client.post(f"/api/v1/admin/users/{target.id}/suspend", json={"reason": "부정 이용"}).status_code == 200
    r = client.post("/api/v1/auth/dev-login", json={"name": "문제회원"})
    assert r.status_code == 403
    login_as(client, "관리자")
    assert client.post(f"/api/v1/admin/users/{target.id}/unsuspend", json={"reason": "소명 확인"}).status_code == 200
    login_as(client, "문제회원")


def test_cannot_demote_self_or_grant_to_unverified(client, db):
    pending = make_user(client, db, "미가입", onboard=False)
    admin = make_user(client, db, "관리자", admin=True)
    assert client.post(f"/api/v1/admin/users/{admin.id}/roles", json={"is_admin": False, "reason": "실수"}).status_code == 400
    assert client.post(f"/api/v1/admin/users/{pending.id}/roles", json={"is_lawyer": True, "reason": "변호사 등록"}).status_code == 400


def test_stats_and_audit_log(client, db):
    make_user(client, db, "관리자", admin=True)
    s = client.get("/api/v1/admin/stats").json()
    assert s["users"]["total"] == 1 and "pending_payment" in s["cases"]["by_status"]
    assert client.get("/api/v1/admin/audit-logs").status_code == 200

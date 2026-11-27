import pytest

from app.core.config import settings
from app.drafting import citations, prompt
from app.drafting.templates import template_for
from app.models.audit import AuditLog
from app.models.case import Case, CaseStatus
from app.models.draft import DocumentDraft, DraftExemplar
from tests.conftest import make_user

INTAKE = {"client_name": "홍길동", "phone": "010-1234-5678", "facts": "2026년 3월에 500만 원을 빌려주었습니다.",
          "answers": {"받을 돈의 원인": "대여금", "갚기로 한 날": "2026-06-30"}}


@pytest.fixture()
def fake_llm(monkeypatch):
    monkeypatch.setattr(settings, "LLM_PROVIDER", "fake")


def make_case(db, user, status=CaseStatus.IN_PROGRESS):
    c = Case(user_id=user.id, service_slug="payment-order", service_name="지급명령 신청", status=status, intake=INTAKE,
             opponent_name="김철수", claim_amount=5_000_000)
    db.add(c)
    db.commit()
    return c


def drafts(client, case_id):
    r = client.get(f"/api/v1/admin/cases/{case_id}/drafts")
    assert r.status_code == 200, r.text
    return r.json()


def test_generate_regenerate_and_manual_edit(client, db, fake_llm):
    customer = make_user(client, db, "고객")
    c = make_case(db, customer)
    make_user(client, db, "변호사", lawyer=True)

    r = client.post(f"/api/v1/admin/cases/{c.id}/drafts/generate", json={})
    assert r.status_code == 200, r.text
    assert r.json()["version"] == 1 and r.json()["status"] == "generating"
    v1 = drafts(client, c.id)["items"][0]
    assert v1["status"] == "ready" and v1["source"] == "ai" and v1["model"] == "fake"
    assert "청구취지" in v1["content"]  # 템플릿 섹션이 입력에 들어갔다

    r = client.post(f"/api/v1/admin/cases/{c.id}/drafts/generate", json={"extra_prompt": "청구원인을 더 짧게", "base_version": 1})
    assert r.status_code == 200, r.text
    v2 = drafts(client, c.id)["items"][0]
    assert v2["version"] == 2 and v2["extra_prompt"] == "청구원인을 더 짧게" and v2["base_version"] == 1 and v2["status"] == "ready"

    r = client.post(f"/api/v1/admin/cases/{c.id}/drafts", json={"content": "직접 고친 본문. 대법원 2019다12345 참조.", "base_version": 2})
    assert r.status_code == 200, r.text
    v3 = r.json()
    assert v3["version"] == 3 and v3["source"] == "human" and v3["base_version"] == 2
    assert v3["flagged_citations"] == [{"kind": "case", "ref": "2019다12345"}]

    items = drafts(client, c.id)["items"]
    assert [d["version"] for d in items] == [3, 2, 1]
    # 감사 기록에는 본문·추가 프롬프트 내용이 남지 않는다
    logs = db.query(AuditLog).filter(AuditLog.action.in_(["draft.generate", "draft.save"])).all()
    assert len(logs) == 3
    assert all("청구원인을 더 짧게" not in str(a.detail) and "직접 고친" not in str(a.detail) for a in logs)


def test_disabled_provider_returns_clear_error(client, db, monkeypatch):
    monkeypatch.setattr(settings, "LLM_PROVIDER", "")
    customer = make_user(client, db, "고객")
    c = make_case(db, customer)
    make_user(client, db, "변호사", lawyer=True)
    r = client.post(f"/api/v1/admin/cases/{c.id}/drafts/generate", json={})
    assert r.status_code == 503 and "설정되지 않았습니다" in r.json()["detail"]
    assert client.get("/api/v1/admin/drafting/status").json()["enabled"] is False
    # 직접 작성은 AI 설정과 무관하게 된다
    assert client.post(f"/api/v1/admin/cases/{c.id}/drafts", json={"content": "본문"}).status_code == 200


def test_bedrock_without_model_id_is_disabled(monkeypatch):
    monkeypatch.setattr(settings, "LLM_PROVIDER", "bedrock")
    monkeypatch.setattr(settings, "BEDROCK_MODEL_ID", "")
    assert settings.drafting_enabled is False


def test_customer_cannot_see_drafts(client, db, fake_llm):
    customer = make_user(client, db, "고객")
    c = make_case(db, customer)
    assert client.get(f"/api/v1/admin/cases/{c.id}/drafts").status_code == 404
    assert client.post(f"/api/v1/admin/cases/{c.id}/drafts/generate", json={}).status_code == 404
    assert client.post(f"/api/v1/admin/cases/{c.id}/drafts", json={"content": "x"}).status_code == 404


def test_not_draftable_before_payment(client, db, fake_llm):
    customer = make_user(client, db, "고객")
    c = make_case(db, customer, status=CaseStatus.PENDING_PAYMENT)
    make_user(client, db, "변호사", lawyer=True)
    assert client.post(f"/api/v1/admin/cases/{c.id}/drafts/generate", json={}).status_code == 409


def test_bad_base_version_and_concurrent_generation(client, db, fake_llm):
    customer = make_user(client, db, "고객")
    c = make_case(db, customer)
    make_user(client, db, "변호사", lawyer=True)
    assert client.post(f"/api/v1/admin/cases/{c.id}/drafts/generate", json={"base_version": 7}).status_code == 400
    db.add(DocumentDraft(case_id=c.id, version=1, content="", source="ai", status="generating", exemplar_ids=[], flagged_citations=[]))
    db.commit()
    assert client.post(f"/api/v1/admin/cases/{c.id}/drafts/generate", json={}).status_code == 409


def test_citation_flagging():
    text = "민법 제750조에 따라 청구합니다. 대법원 2010도1234 판결, 형법 제347조 제1항 참조."
    flagged = citations.flag(text, ["민법 제750조", "2010도1234"])
    assert flagged == [{"kind": "statute", "ref": "형법 제347조"}]
    assert {f["ref"] for f in citations.flag(text, [])} == {"민법 제750조", "2010도1234", "형법 제347조"}


def test_prompt_excludes_phone_and_uses_only_checked_exemplars(db):
    from app.drafting.service import pick_exemplars

    c = Case(user_id=1, service_slug="payment-order", service_name="지급명령 신청", intake=INTAKE, opponent_name="김철수")
    db.add_all([
        DraftExemplar(service_slug="payment-order", title="확인 전 예시", content="미확인"),
        DraftExemplar(service_slug="payment-order", title="확인된 예시", content="좋은 예시 본문", deidentified_checked_by=1),
    ])
    db.commit()
    picked = pick_exemplars(db, "payment-order")
    assert [e.title for e in picked] == ["확인된 예시"]
    system, messages = prompt.build(c, template_for(c.service_slug), picked, None, "더 간결하게")
    text = messages[0]["text"]
    assert "010-1234-5678" not in text and "홍길동" in text and "좋은 예시 본문" in text and "더 간결하게" in text
    assert "지어내지" in system

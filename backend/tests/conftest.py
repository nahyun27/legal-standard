import os
import tempfile

# 앱을 import 하기 전에 테스트 설정을 넣는다(.env 보다 환경변수가 우선).
os.environ.update(
    ENV="test",
    DATABASE_URL="sqlite://",
    JWT_SECRET_KEY="test-secret-" + "x" * 40,
    DEV_LOGIN_ENABLED="true",
    COOKIE_SECURE="false",
    KAKAO_CLIENT_ID="kakao-id",
    KAKAO_CLIENT_SECRET="",
    NAVER_CLIENT_ID="",
    NAVER_CLIENT_SECRET="",
    TOSS_SECRET_KEY="",
    STORAGE_DIR=tempfile.mkdtemp(prefix="ls-test-storage-"),
)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.core.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402

engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSession = sessionmaker(bind=engine, autoflush=False)


@pytest.fixture()
def db():
    Base.metadata.create_all(engine)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)


@pytest.fixture()
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app, base_url="http://localhost:8002") as c:
        yield c
    app.dependency_overrides.clear()


ONBOARD = {"name": "홍길동", "phone": "010-1234-5678", "agree_terms": True, "agree_privacy": True, "marketing_consent": False}


def make_user(client, db, name, *, onboard=True, admin=False, lawyer=False):
    """dev-login 으로 로그인(쿠키가 이 사용자로 바뀐다) + 필요하면 가입 마무리·권한 부여."""
    from app.models.user import User

    r = client.post("/api/v1/auth/dev-login", json={"name": name})
    assert r.status_code == 200, r.text
    if onboard:
        r = client.post("/api/v1/auth/me/onboarding", json={**ONBOARD, "name": name if len(name) >= 2 else name * 2})
        assert r.status_code == 200, r.text
    u = db.get(User, r.json()["id"])
    u.is_admin, u.is_lawyer = admin, lawyer
    db.commit()
    return u


def login_as(client, name):
    r = client.post("/api/v1/auth/dev-login", json={"name": name})
    assert r.status_code == 200, r.text

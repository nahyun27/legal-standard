from functools import lru_cache
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

INSECURE_JWT_SECRETS = {"", "please-change-me", "change-me-in-production"}


class Settings(BaseSettings):
    PROJECT_NAME: str = "Legal Standard API"
    API_V1_PREFIX: str = "/api/v1"
    ENV: Literal["local", "test", "production"] = "local"

    DATABASE_URL: str = "postgresql+psycopg2://legal:legal1234@localhost:5434/legal_standard"

    JWT_SECRET_KEY: str = Field(default="please-change-me")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 14

    # https 서비스면 반드시 True. http(로컬)에서 True 면 브라우저가 쿠키를 버린다.
    COOKIE_SECURE: bool = False
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    FRONTEND_BASE_URL: str = "http://localhost:3000"
    BACKEND_BASE_URL: str = "http://localhost:8002"

    KAKAO_CLIENT_ID: str | None = None
    KAKAO_CLIENT_SECRET: str | None = None
    NAVER_CLIENT_ID: str | None = None
    NAVER_CLIENT_SECRET: str | None = None

    DEV_LOGIN_ENABLED: bool = False

    # 토스페이먼츠. 시크릿 키가 비어 있으면 시뮬레이션 모드(결제창 없이 바로 결제완료 처리).
    # 시뮬레이션 여부는 오직 이 서버 설정으로만 정한다 — 클라이언트가 보내는 값으로 정하면 결제 우회 구멍이 된다(KCPEC 2026-09 교훈).
    TOSS_SECRET_KEY: str | None = None
    TOSS_CLIENT_KEY: str | None = None
    TOSS_API_BASE: str = "https://api.tosspayments.com"

    # 사건 파일(증거·서면) 저장 위치. 공개 static 경로에 두지 않고, 다운로드는 항상 권한 확인 API 를 거친다.
    STORAGE_DIR: str = "storage"
    MAX_UPLOAD_MB: int = 20

    # 실비 계산 단가 — 오픈 전 법원 송달료 고시·우체국 요금으로 반드시 확인할 것(바뀌면 여기만 고친다).
    COURT_SERVICE_UNIT_KRW: int = 5_500
    CERTIFIED_LETTER_POSTAGE_KRW: int = 5_000

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=True, extra="ignore")

    @model_validator(mode="after")
    def _guard_production(self) -> "Settings":
        # KCPEC 에서는 기본 시크릿을 경고만 했는데, 그대로 배포되면 누구나 로그인 토큰을 위조할 수 있다 —
        # 여기서는 운영 환경이면 기동 자체를 막는다.
        if self.ENV == "production":
            if self.JWT_SECRET_KEY in INSECURE_JWT_SECRETS or len(self.JWT_SECRET_KEY) < 32:
                raise ValueError("운영 환경에서는 JWT_SECRET_KEY 를 32자 이상 랜덤값으로 설정해야 합니다.")
            if not self.COOKIE_SECURE:
                raise ValueError("운영 환경에서는 COOKIE_SECURE=true 여야 합니다.")
            if not self.TOSS_SECRET_KEY:
                raise ValueError("운영 환경에서는 TOSS_SECRET_KEY 가 필요합니다(시뮬레이션 결제 금지).")
        return self

    @property
    def dev_login_allowed(self) -> bool:
        """개발용 로그인은 운영 환경에서 설정값과 무관하게 항상 꺼진다."""
        return self.DEV_LOGIN_ENABLED and self.ENV != "production"

    @property
    def payment_simulated(self) -> bool:
        return not self.TOSS_SECRET_KEY


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

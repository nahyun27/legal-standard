import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

_MOBILE = re.compile(r"^01[016789]\d{7,8}$")


def normalize_phone(v: str) -> str:
    digits = re.sub(r"[\s-]", "", v)
    if not _MOBILE.match(digits):
        raise ValueError("휴대폰 번호 형식이 올바르지 않습니다.")
    return digits


def normalize_name(v: str) -> str:
    v = v.strip()
    if not 2 <= len(v) <= 50:
        raise ValueError("이름은 2자 이상 50자 이하로 입력해 주세요.")
    return v


class ProvidersResponse(BaseModel):
    kakao: bool
    naver: bool
    dev: bool


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    social_provider: str
    email: str | None
    name: str | None
    phone: str | None
    marketing_consent: bool | None
    is_onboarded: bool
    is_admin: bool
    is_lawyer: bool
    created_at: datetime


class SessionResponse(BaseModel):
    user: UserResponse | None


class OnboardingRequest(BaseModel):
    """가입 마무리 — 필수 약관 2종은 반드시 true 여야 한다."""

    name: str
    phone: str
    agree_terms: bool
    agree_privacy: bool
    marketing_consent: bool = False

    _name = field_validator("name")(normalize_name)
    _phone = field_validator("phone")(normalize_phone)

    @field_validator("agree_terms", "agree_privacy")
    @classmethod
    def _required(cls, v: bool) -> bool:
        if not v:
            raise ValueError("필수 약관에 동의해야 가입할 수 있습니다.")
        return v


class ProfileUpdateRequest(BaseModel):
    name: str | None = None
    phone: str | None = None
    marketing_consent: bool | None = None

    @field_validator("name")
    @classmethod
    def _n(cls, v: str | None) -> str | None:
        return None if v is None else normalize_name(v)

    @field_validator("phone")
    @classmethod
    def _p(cls, v: str | None) -> str | None:
        return None if v is None else normalize_phone(v)


class DevLoginRequest(BaseModel):
    name: str = Field(min_length=1, max_length=30)

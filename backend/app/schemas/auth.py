import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.passwords import normalize_email

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
    password: bool = True


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
    has_password: bool = False
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


class PasswordRegisterRequest(BaseModel):
    """이메일·비밀번호 가입. 실명·연락처·약관 동의는 기존 가입 마무리(/auth/onboarding)에서 받는다."""

    email: str
    password: str = Field(max_length=128)

    _email = field_validator("email")(normalize_email)


class PasswordLoginRequest(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=128)


class PasswordForgotRequest(BaseModel):
    email: str = Field(max_length=254)


class PasswordResetRequest(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    password: str = Field(max_length=128)


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(max_length=128)
    new_password: str = Field(max_length=128)

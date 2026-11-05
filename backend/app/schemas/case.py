from pydantic import BaseModel, Field, field_validator

from app.schemas.auth import normalize_name, normalize_phone


class IntakeIn(BaseModel):
    """공통 문진. 상품별 추가 문항은 answers 에 담는다(문항 정의는 프론트, 저장은 원문 그대로)."""

    service_slug: str
    # 가격 선택지 — self / atty 또는 상품별 키(catalog.Product.fees). 상품에 있는 키인지는 API 에서 확인한다
    track: str | None = Field(default=None, max_length=10)
    units: int = Field(default=1, ge=1, le=10)  # 개수 단위 상품(고소사실 수)
    screening: dict[str, str] = Field(default_factory=dict)  # 정찰가 수임 조건 문항의 답(catalog.Screen.key)
    client_name: str
    phone: str
    opponent_name: str | None = Field(default=None, max_length=100)
    claim_amount: int | None = Field(default=None, ge=0, le=100_000_000_000)
    facts: str = Field(default="", max_length=10_000)
    answers: dict[str, str] = Field(default_factory=dict)
    source: str | None = Field(default=None, max_length=100)
    # "다음 단계 이어서 신청"이면 이전 사건 id — 본인 사건이어야 한다
    parent_case_id: int | None = None

    _name = field_validator("client_name")(normalize_name)
    _phone = field_validator("phone")(normalize_phone)

    @field_validator("answers")
    @classmethod
    def _answers_limit(cls, v: dict[str, str]) -> dict[str, str]:
        if len(v) > 50 or any(len(k) > 50 or len(x) > 5_000 for k, x in v.items()):
            raise ValueError("문진 답변이 너무 깁니다.")
        return v


class PaymentStartIn(BaseModel):
    """결제 전 필수 동의. 전자상거래법상 용역 착수 후 청약철회가 제한된다는 사실을 미리 알리고 동의받아야 한다."""

    agree_engagement: bool  # 표준 업무범위·수임 조건
    agree_withdrawal: bool  # 청약철회 제한 고지

    @field_validator("agree_engagement", "agree_withdrawal")
    @classmethod
    def _required(cls, v: bool) -> bool:
        if not v:
            raise ValueError("결제 전 안내에 모두 동의해 주세요.")
        return v


class QuoteIn(BaseModel):
    fee: int = Field(ge=10_000, le=100_000_000)
    note: str = Field(min_length=2, max_length=2_000)


class CitationIn(BaseModel):
    text: str = Field(min_length=2, max_length=20_000)


class MfaCodeIn(BaseModel):
    code: str = Field(min_length=6, max_length=8)


class ConfirmIn(BaseModel):
    order_id: str
    payment_key: str = Field(min_length=1)
    amount: int


class ReasonIn(BaseModel):
    reason: str = Field(min_length=2, max_length=1_000)


class AcceptIn(BaseModel):
    lawyer_id: int
    # 이해충돌을 확인했다는 명시적 확인 — 확인 없이 수임 확정 버튼이 눌리지 않게 한다
    conflict_checked: bool

    @field_validator("conflict_checked")
    @classmethod
    def _must_check(cls, v: bool) -> bool:
        if not v:
            raise ValueError("이해충돌 확인 후 수임을 확정할 수 있습니다.")
        return v


class ApproveIn(BaseModel):
    checklist: list[str]


class DeliverIn(BaseModel):
    note: str = Field(min_length=2, max_length=1_000)  # 등기번호·접수번호 등


class NoteIn(BaseModel):
    text: str = Field(min_length=1, max_length=5_000)


class RolesIn(BaseModel):
    is_admin: bool | None = None
    is_lawyer: bool | None = None
    reason: str = Field(min_length=2, max_length=1_000)


class RetainerSignIn(BaseModel):
    """전자 수임약정 서명 — 문진의 의뢰인 성명을 그대로 입력하고 동의해야 한다."""

    name: str = Field(min_length=2, max_length=50)
    agree: bool
    sha256: str = Field(min_length=64, max_length=64)  # 화면에 보여 준 문안의 해시 — 그 사이 문안이 바뀌었으면 거부


class ChargeIn(BaseModel):
    addon: str = Field(max_length=40)
    option: str = Field(max_length=40)
    note: str = Field(min_length=2, max_length=500)  # 예: 11/20(목) 14:00 서울중앙지법 민사 제○○호 법정

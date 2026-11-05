"""주문 가능한 상품의 서버측 정찰가·납기·검수 체크리스트.

결제 금액은 반드시 이 값으로 서버가 계산한다(클라이언트가 보낸 금액은 믿지 않는다).
가격 원본은 프론트 src/data/services.ts 이고, 둘이 어긋나면 tests/test_catalog.py 가 실패한다.
파일럿 범위만 주문 가능 — 나머지 상품은 여기에 추가하면서 연다.

가격 선택지(option, 사건의 track 칸에 저장):
- 두 방식 상품: self = 변호사가 검토한 서면을 의뢰인 본인 명의로 직접 제출·발송,
  atty = 수임약정 후 변호사 명의로 제출·발송하고 절차에 대응.
- 단계별 상품(피의사건 변호)·장수 구간 상품(계약서 검토)은 그 상품의 선택지 키.
"""

from dataclasses import dataclass, field
from typing import Literal

CostKind = Literal["none", "certified_letter", "payment_order", "small_claims"]

TRACK_LABEL: dict[str, str] = {"self": "직접 제출", "atty": "변호사 명의"}


@dataclass(frozen=True)
class Addon:
    """수임 후 횟수만큼 더해지는 요금(기일·조사 출석). 변호사가 사건에 청구하고 고객이 결제한다."""

    key: str
    label: str
    per: str
    options: dict[str, int]


@dataclass(frozen=True)
class Screen:
    """정찰가로 맡는 조건 한 줄 — 문진 답이 required 와 다르면 접수하지 않고 개별 상담으로 안내한다."""

    key: str
    question: str
    required: str
    options: tuple[str, ...]


@dataclass(frozen=True)
class Product:
    slug: str
    name: str
    fees: dict[str, int] | None  # 선택지별 정찰가(단가). None = 개별 견적(심화 상담) — 결제 없이 바로 수임 검토로 간다
    cost_kind: CostKind
    turnaround_days: int  # 수임 확정 후 표준 납기(영업일)
    # 변호사가 검수 완료 전에 전부 확인해야 하는 항목(사건유형별 검수 체크리스트)
    checklist: tuple[str, ...] = field(default_factory=tuple)
    needs_claim_amount: bool = False
    labels: dict[str, str] = field(default_factory=dict)  # self/atty 외 선택지의 이름
    retainer_options: tuple[str, ...] = ("atty",)  # 전자 수임약정이 필요한 선택지
    unit_label: str | None = None  # 개수 단위(예: 고소사실). 있으면 수임료 = 단가 × 개수
    max_units: int = 1
    addons: tuple[Addon, ...] = ()
    screening: tuple[Screen, ...] = ()

    @property
    def is_quote(self) -> bool:
        return self.fees is None

    def fee(self, option: str | None, units: int = 1) -> int:
        return (self.fees or {}).get(option or "", 0) * max(1, units)

    def label(self, option: str | None) -> str:
        return self.labels.get(option or "") or TRACK_LABEL.get(option or "", "")

    def needs_retainer(self, option: str | None) -> bool:
        return not self.is_quote and option in self.retainer_options

    def checklist_for(self, option: str | None) -> tuple[str, ...]:
        """수임약정을 맺고 대리인으로 나가는 선택지는 대리 범위 확인이 하나 더 붙는다."""
        return self.checklist + (RETAINER_CHECK,) if self.needs_retainer(option) else self.checklist

    def addon(self, key: str) -> Addon | None:
        return next((a for a in self.addons if a.key == key), None)


COMMON_CHECKS = (
    "당사자(의뢰인·상대방) 표시가 문진·증거와 일치한다",
    "인용한 법령·판례가 실제로 존재하고 취지가 맞다",
    "결과 보장·위협·과장 표현이 없다",
)
RETAINER_CHECK = "대리인 표시와 위임 범위가 서명된 수임약정과 일치한다"
COMPLAINT_CHECKS = COMMON_CHECKS + ("죄명별 구성요건 사실을 모두 적었다", "증거목록과 본문 내용이 대응한다", "고소기간 등 기간 제한을 확인했다")
APPEARANCE = {"수도권": 700_000, "비수도권": 970_000}

PRODUCTS: dict[str, Product] = {
    p.slug: p
    for p in [
        Product(
            "certified-letter", "내용증명 발송", {"self": 55_000, "atty": 450_000}, "certified_letter", 2,
            COMMON_CHECKS + ("청구 금액·근거가 증거와 일치한다", "이행 기한과 불이행 시 다음 절차를 명시했다"),
            needs_claim_amount=True,
        ),
        Product(
            "payment-order", "지급명령 신청", {"self": 150_000, "atty": 250_000}, "payment_order", 3,
            COMMON_CHECKS + ("청구취지·청구원인이 요건사실을 모두 갖췄다", "관할 법원과 채무자 주소(송달 가능성)를 확인했다", "지연손해금 기산일·이율이 맞다"),
            needs_claim_amount=True,
        ),
        Product(
            "complaint", "형사 고소장", {"self": 220_000, "atty": 480_000}, "none", 5, COMPLAINT_CHECKS,
            unit_label="고소사실", max_units=5,
            addons=(Addon("police-appearance", "고소인 조사 출석 동행", "1회", APPEARANCE),),
        ),
        Product(
            "suspect-defense", "피의사건 정찰 변호",
            {"opinion": 1_100_000, "appear": 2_200_000, "trial": 3_300_000}, "none", 10,
            COMMON_CHECKS + ("혐의 인정·혐의 1개·불구속 조건을 다시 확인했다", "양형자료 목록과 의견서 내용이 대응한다"),
            labels={"opinion": "수사단계 의견서", "appear": "수사단계 출석 변호", "trial": "법원단계 변론"},
            retainer_options=("opinion", "appear", "trial"),
            screening=(
                Screen("confession", "혐의를 인정하고 사실관계를 다투지 않나요?", "예", ("예", "아니오", "잘 모르겠음")),
                Screen("charges", "혐의는 몇 개인가요?", "1개", ("1개", "2개 이상")),
                Screen("custody", "구속되었거나 구속영장이 청구되었나요?", "아니오", ("예", "아니오")),
            ),
        ),
        Product(
            "contract-review", "계약서 검토",
            {"p5": 90_000, "p10": 150_000, "p20": 300_000, "p20plus": 1_000_000}, "none", 3,
            COMMON_CHECKS + ("계약서 장수가 고른 구간과 맞다", "조항별 위험 표시와 종합 의견이 빠짐없다"),
            labels={"p5": "1~5장", "p10": "6~10장", "p20": "11~20장", "p20plus": "20장 초과"},
            retainer_options=(),
        ),
        Product("advanced", "심화 사건 상담", None, "none", 1, ("이해충돌을 확인했다", "본체 법인 담당 변호사에게 전달했다")),
    ]
}


def get_product(slug: str) -> Product | None:
    return PRODUCTS.get(slug)


def service_name(product: Product, option: str | None, units: int = 1) -> str:
    """사건에 남기는 상품명 — 선택지와 개수까지 붙여서 관리자·고객 화면 어디서나 구분되게 한다."""
    if product.is_quote or not product.label(option):
        return product.name
    count = f" · {product.unit_label} {units}개" if product.unit_label and units > 1 else ""
    return f"{product.name} · {product.label(option)}{count}"

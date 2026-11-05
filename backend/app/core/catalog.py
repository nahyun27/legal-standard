"""주문 가능한 상품의 서버측 정찰가·납기·검수 체크리스트.

결제 금액은 반드시 이 값으로 서버가 계산한다(클라이언트가 보낸 금액은 믿지 않는다).
가격 원본은 프론트 src/data/services.ts 이고, 둘이 어긋나면 tests/test_catalog.py 가 실패한다.
파일럿(2026.11) 범위만 주문 가능 — 나머지 상품은 여기에 추가하면서 연다.

방식(track)은 두 가지다. self = 변호사가 작성·검토한 서면을 의뢰인 본인 명의로 직접 제출·발송,
atty = 수임약정 후 변호사 명의로 제출·발송하고 절차에 대응. 상품마다 고를 수 있는 방식과 가격이 다르다.
"""

from dataclasses import dataclass, field
from typing import Literal

CostKind = Literal["none", "certified_letter", "payment_order", "small_claims"]
Track = Literal["self", "atty"]

TRACK_LABEL: dict[str, str] = {"self": "직접 제출", "atty": "변호사 명의"}


@dataclass(frozen=True)
class Product:
    slug: str
    name: str
    fees: dict[str, int] | None  # 방식별 정찰가. None = 개별 견적(심화 상담) — 결제 없이 바로 수임 검토로 간다
    cost_kind: CostKind
    turnaround_days: int  # 수임 확정 후 표준 납기(영업일)
    # 변호사가 검수 완료 전에 전부 확인해야 하는 항목(기획서 IX 원칙 3 "사건유형별 검수 체크리스트")
    checklist: tuple[str, ...] = field(default_factory=tuple)
    needs_claim_amount: bool = False

    @property
    def is_quote(self) -> bool:
        return self.fees is None

    def fee(self, track: str | None) -> int:
        return (self.fees or {}).get(track or "", 0)

    def checklist_for(self, track: str | None) -> tuple[str, ...]:
        """변호사 명의 방식은 대리인으로 나가므로 수임약정·위임장 확인이 하나 더 붙는다."""
        return self.checklist + (ATTY_CHECK,) if track == "atty" else self.checklist


COMMON_CHECKS = (
    "당사자(의뢰인·상대방) 표시가 문진·증거와 일치한다",
    "인용한 법령·판례가 실제로 존재하고 취지가 맞다",
    "결과 보장·위협·과장 표현이 없다",
)
ATTY_CHECK = "수임약정과 위임장을 받았다"
COMPLAINT_CHECKS = COMMON_CHECKS + ("죄명별 구성요건 사실을 모두 적었다", "증거목록과 본문 내용이 대응한다", "고소기간 등 기간 제한을 확인했다")

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
        Product("complaint", "형사 고소장", {"self": 220_000, "atty": 480_000}, "none", 5, COMPLAINT_CHECKS),
        Product("advanced", "심화 사건 상담", None, "none", 1, ("이해충돌을 확인했다", "본체 법인 담당 변호사에게 전달했다")),
    ]
}


def get_product(slug: str) -> Product | None:
    return PRODUCTS.get(slug)


def service_name(product: Product, track: str | None) -> str:
    """사건에 남기는 상품명 — 방식까지 붙여서 관리자·고객 화면 어디서나 구분되게 한다."""
    return f"{product.name} · {TRACK_LABEL[track]}" if track in TRACK_LABEL and not product.is_quote else product.name

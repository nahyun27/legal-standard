"""주문 가능한 상품의 서버측 정찰가·납기·검수 체크리스트.

결제 금액은 반드시 이 값으로 서버가 계산한다(클라이언트가 보낸 금액은 믿지 않는다).
가격 원본은 프론트 src/data/services.ts 이고, 둘이 어긋나면 tests/test_catalog.py 가 실패한다.
파일럿(2026.11) 범위만 주문 가능 — 나머지 상품은 여기에 추가하면서 연다.
"""

from dataclasses import dataclass, field
from typing import Literal

CostKind = Literal["none", "certified_letter", "payment_order", "small_claims"]


@dataclass(frozen=True)
class Product:
    slug: str
    name: str
    fee: int | None  # None = 개별 견적(심화 상담) — 결제 없이 바로 수임 검토로 간다
    cost_kind: CostKind
    turnaround_days: int  # 수임 확정 후 표준 납기(영업일)
    # 변호사가 검수 완료 전에 전부 확인해야 하는 항목(기획서 IX 원칙 3 "사건유형별 검수 체크리스트")
    checklist: tuple[str, ...] = field(default_factory=tuple)
    needs_claim_amount: bool = False


COMMON_CHECKS = (
    "당사자(의뢰인·상대방) 표시가 문진·증거와 일치한다",
    "인용한 법령·판례가 실제로 존재하고 취지가 맞다",
    "결과 보장·위협·과장 표현이 없다",
)

PRODUCTS: dict[str, Product] = {
    p.slug: p
    for p in [
        Product(
            "certified-letter", "내용증명 발송", 55_000, "certified_letter", 2,
            COMMON_CHECKS + ("청구 금액·근거가 증거와 일치한다", "이행 기한과 불이행 시 다음 절차를 명시했다"),
            needs_claim_amount=True,
        ),
        Product(
            "payment-order", "지급명령 신청", 190_000, "payment_order", 3,
            COMMON_CHECKS + ("청구취지·청구원인이 요건사실을 모두 갖췄다", "관할 법원과 채무자 주소(송달 가능성)를 확인했다", "지연손해금 기산일·이율이 맞다"),
            needs_claim_amount=True,
        ),
        Product(
            "complaint-basic", "형사 고소장 (기본형)", 219_000, "none", 5,
            COMMON_CHECKS + ("죄명별 구성요건 사실을 모두 적었다", "증거목록과 본문 내용이 대응한다", "고소기간 등 기간 제한을 확인했다"),
        ),
        Product(
            "complaint-standard", "형사 고소장 (표준형)", 290_000, "none", 5,
            COMMON_CHECKS + ("죄명별 구성요건 사실을 모두 적었다", "증거목록과 본문 내용이 대응한다", "고소기간 등 기간 제한을 확인했다", "관할 수사기관과 위임장을 확인했다"),
        ),
        Product(
            "draft-review", "초안 검토·보완", 110_000, "none", 2,
            COMMON_CHECKS + ("요건사실 누락을 점검했다", "보완 의견을 의뢰인이 이해할 수 있게 적었다"),
        ),
        Product("advanced", "심화 사건 상담", None, "none", 1, ("이해충돌을 확인했다", "본체 법인 담당 변호사에게 전달했다")),
    ]
}


def get_product(slug: str) -> Product | None:
    return PRODUCTS.get(slug)

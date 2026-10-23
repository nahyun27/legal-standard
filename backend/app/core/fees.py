"""정찰가 총액 계산 — 수임료 + 부가세 + 실비(인지대·송달료·발송비).

결제 전 총액 화면에 항목별로 보여주고(기획서 VII "실비·부가세는 결제 전 총액 화면에서 항목별 표시"),
결제 금액도 이 함수가 만든 값만 쓴다.
"""

from dataclasses import dataclass

from app.core.catalog import Product
from app.core.config import settings


def stamp_fee(claim: int) -> int:
    """민사소송 등 인지법 제2조의 소장 인지액. 100원 미만 버림, 최저 1,000원."""
    if claim < 10_000_000:
        fee = claim * 50 / 10_000
    elif claim < 100_000_000:
        fee = claim * 45 / 10_000 + 5_000
    elif claim < 1_000_000_000:
        fee = claim * 40 / 10_000 + 55_000
    else:
        fee = claim * 35 / 10_000 + 555_000
    return max(1_000, int(fee) // 100 * 100)


def electronic(fee: int) -> int:
    """전자소송은 인지액의 1/10 을 감액한다. 100원 미만 버림."""
    return max(1_000, int(fee * 0.9) // 100 * 100)


@dataclass
class CostLine:
    label: str
    amount: int
    note: str | None = None


@dataclass
class Quote:
    fee: int
    vat: int
    costs: list[CostLine]

    @property
    def costs_total(self) -> int:
        return sum(c.amount for c in self.costs)

    @property
    def total(self) -> int:
        return self.fee + self.vat + self.costs_total


def quote(product: Product, claim_amount: int | None) -> Quote:
    fee = product.fee or 0
    vat = fee // 10
    unit = settings.COURT_SERVICE_UNIT_KRW
    costs: list[CostLine] = []
    claim = max(0, claim_amount or 0)

    if product.cost_kind == "certified_letter":
        costs.append(CostLine("내용증명 우편 발송비", settings.CERTIFIED_LETTER_POSTAGE_KRW, "우체국 요금 기준 예상액"))
    elif product.cost_kind == "payment_order" and claim:
        # 지급명령 인지액은 소장의 1/10, 전자소송 감액 적용. 송달료는 당사자 2인 × 6회분.
        costs.append(CostLine("인지대", electronic(max(1_000, stamp_fee(claim) // 10 // 100 * 100)), f"소가 {claim:,}원 기준"))
        costs.append(CostLine("송달료", unit * 2 * 6, f"당사자 2인 × 6회분 × {unit:,}원"))
    elif product.cost_kind == "small_claims" and claim:
        costs.append(CostLine("인지대", electronic(stamp_fee(claim)), f"소가 {claim:,}원 기준"))
        costs.append(CostLine("송달료", unit * 2 * 10, f"당사자 2인 × 10회분 × {unit:,}원"))
    return Quote(fee=fee, vat=vat, costs=costs)

"""전자 수임약정 — 변호사 명의 선택지(atty 등)는 수임 확정 뒤 의뢰인이 온라인으로 서명해야 검수를 마칠 수 있다.

문안은 사건 정보(상품·선택지·금액·추가 요금)로 서버가 만든다. 서명할 때 본문의 SHA-256 을 함께 남겨
나중에 "어떤 문안에 서명했는지"를 재현·대조할 수 있게 한다. 문안은 초안 — 법무법인 확정 필요.
"""

import hashlib

from app.core.catalog import Product
from app.core.config import settings
from app.models.case import Case


def won(n: int) -> str:
    return f"{n:,}원"


def retainer_text(c: Case, product: Product) -> str:
    client = c.intake.get("client_name") or "의뢰인"
    opponent = c.opponent_name or "(문진에 적은 상대방)"
    lines = [
        f"수임약정서 (문안 {settings.RETAINER_VERSION})",
        "",
        f"의뢰인 {client}(이하 \"의뢰인\")과 {settings.FIRM_NAME}(이하 \"법인\")은 다음과 같이 사건 위임 계약을 맺습니다.",
        "",
        "제1조 (위임 사건)",
        f"사건번호 {c.case_no}, 상품 「{c.service_name}」, 상대방 {opponent}.",
        "",
        "제2조 (업무 범위)",
        "법인은 리걸스탠다드 상품 페이지에 결제 전 공개된 표준 업무범위에 따라, 법인 소속 변호사를 대리인으로 하여 "
        "서면을 작성·검토하고 법인 명의로 제출·발송하며 그에 따른 절차에 대응합니다. "
        "공개된 업무범위를 넘는 업무는 별도 약정이 있어야 합니다.",
        "",
        "제3조 (수임료)",
        f"수임료는 {won(c.fee)}(부가세 {won(c.vat)} 별도)이며 결제로 지급을 마쳤습니다. "
        "인지대·송달료 등 실비는 수임료에 포함되지 않습니다.",
    ]
    if product.addons:
        extra = "; ".join(f"{a.label}({a.per}당) " + ", ".join(f"{k} {won(v)}" for k, v in a.options.items()) for a in product.addons)
        lines += ["", "제4조 (추가 요금)", f"다음 업무가 필요해지면 정해진 가격으로 따로 청구하고, 의뢰인이 결제한 뒤 수행합니다: {extra} (부가세 별도)."]
    lines += [
        "",
        "제5조 (해지와 환불)",
        "법인이 수임하지 않기로 하거나 이해충돌이 확인되면 결제금액 전액을 돌려드립니다. "
        "업무를 시작한 뒤 의뢰인이 해지하면 이미 수행한 업무의 비율에 따라 정산합니다.",
        "",
        "제6조 (비밀유지)",
        "법인은 변호사법에 따른 비밀유지의무를 지며, 사건 자료를 사건 처리 외의 목적에 쓰지 않습니다.",
        "",
        "의뢰인은 위 내용을 확인하고 성명을 입력해 전자적으로 서명합니다.",
    ]
    return "\n".join(lines)


def digest(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

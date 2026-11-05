"""서버 정찰가가 프론트(src/data/services.ts)와 같은지, 실비 계산이 법정 산식대로인지."""

import re
from pathlib import Path

from app.core.catalog import PRODUCTS
from app.core.fees import electronic, quote, stamp_fee

SERVICES_TS = Path(__file__).resolve().parents[2] / "src" / "data" / "services.ts"


def frontend_prices() -> dict[str, dict[str, int]]:
    """SERVICES 배열을 상품 블록(들여쓰기 2칸의 '{' 로 시작)으로 잘라 각 블록의 slug 와 방식별 정찰가를 읽는다."""
    src = SERVICES_TS.read_text(encoding="utf-8")
    out = {}
    for block in re.split(r"^  \{$", src, flags=re.M)[1:]:
        slug = re.search(r"^    slug: '([\w-]+)',$", block, re.M)
        tracks = re.findall(r"\{ kind: '(self|atty)',[^\n]*?amount: ([\d_]+)", block)
        if slug and tracks:
            out[slug.group(1)] = {k: int(a.replace("_", "")) for k, a in tracks}
    return out


def test_server_prices_match_frontend():
    front = frontend_prices()
    assert front, "services.ts 에서 가격을 읽지 못했다 — 형식이 바뀌었으면 이 파서도 고칠 것"
    for slug, p in PRODUCTS.items():
        if p.is_quote:
            continue
        assert front.get(slug) == p.fees, f"{slug}: 서버 {p.fees} / 프론트 {front.get(slug)} — 가격을 한쪽만 바꿨다"


def test_stamp_fee_brackets():
    assert stamp_fee(5_000_000) == 25_000          # 1천만 미만 × 0.5%
    assert stamp_fee(20_000_000) == 95_000         # × 0.45% + 5,000
    assert stamp_fee(200_000_000) == 855_000       # × 0.4% + 55,000
    assert stamp_fee(100_000) == 1_000             # 최저 1,000원
    assert electronic(25_000) == 22_500            # 전자소송 10% 감액


def test_quote_payment_order_items():
    q = quote(PRODUCTS["payment-order"], 5_000_000, "atty")
    assert q.fee == 250_000 and q.vat == 25_000
    labels = {c.label: c.amount for c in q.costs}
    assert labels["인지대"] == 2_200               # 25,000 / 10 = 2,500 → 전자 감액 2,250 → 100원 미만 버림
    assert labels["송달료"] == 5_500 * 2 * 6
    assert q.total == 250_000 + 25_000 + 2_200 + 66_000


def test_quote_without_costs():
    q = quote(PRODUCTS["complaint"], None, "atty")
    assert q.costs == [] and q.total == 528_000


def test_atty_track_adds_retainer_check():
    p = PRODUCTS["complaint"]
    assert len(p.checklist_for("atty")) == len(p.checklist_for("self")) + 1

"""서면 인용(판례 사건번호·법령명) 실존 확인 — 기획서 IX 원칙 3 "인용 법령·판례 자동 실존검증".

국가법령정보센터 Open API(DRF)를 쓴다. 인증값(LAW_API_OC)이 없거나 조회에 실패하면 "확인 불가"로 돌려주고,
절대 "존재함"으로 추정하지 않는다. 조문 번호까지의 확인과 판시 취지 확인은 변호사 몫이다.
※ 실제 API 키로는 아직 확인하지 않았다 — 키 발급 후 응답 형식을 한 번 점검할 것.
"""

import re

import httpx

from app.core.config import settings

DRF = "https://www.law.go.kr/DRF/lawSearch.do"

# 2019다12345, 2021고단3079, 2023도 1234 등
CASE_NO = re.compile(r"(?<![\d가-힣])((?:19|20)\d{2})\s?([가-힣]{1,4})\s?(\d{1,7})(?!\d)")
# 민법 제750조, 민사소송법 제470조의2, 형법 제347조 제1항
STATUTE = re.compile(r"([가-힣]+(?:\s[가-힣]+)?(?:법|령|규칙))\s*제\s?(\d+)\s?조(?:의\s?(\d+))?")


def extract(text: str) -> list[dict]:
    seen: set[str] = set()
    items: list[dict] = []
    for m in CASE_NO.finditer(text):
        ref = f"{m.group(1)}{m.group(2)}{m.group(3)}"
        if ref not in seen:
            seen.add(ref)
            items.append({"kind": "case", "ref": ref})
    for m in STATUTE.finditer(text):
        law = m.group(1).replace(" ", "")
        ref = f"{law} 제{m.group(2)}조" + (f"의{m.group(3)}" if m.group(3) else "")
        if ref not in seen:
            seen.add(ref)
            items.append({"kind": "statute", "ref": ref, "law": law})
    return items[:50]


def _search(target: str, query: str) -> int | None:
    """검색 결과 건수. 조회 실패면 None."""
    try:
        res = httpx.get(DRF, params={"OC": settings.LAW_API_OC, "target": target, "type": "JSON", "query": query}, timeout=10.0)
        data = res.json()
    except (httpx.HTTPError, ValueError):
        return None
    root = data.get("PrecSearch" if target == "prec" else "LawSearch") or {}
    try:
        return int(root.get("totalCnt", 0))
    except (TypeError, ValueError):
        return None


def check(text: str) -> list[dict]:
    items = extract(text)
    for it in items:
        if not settings.LAW_API_OC:
            it.update(status="unknown", message="API 인증값 미설정 — 직접 확인 필요")
            continue
        n = _search("prec", it["ref"]) if it["kind"] == "case" else _search("law", it["law"])
        if n is None:
            it.update(status="unknown", message="조회 실패 — 직접 확인 필요")
        elif n == 0:
            it.update(status="not_found", message="검색 결과 없음 — 번호·명칭을 다시 확인하세요")
        else:
            it.update(status="found", message="존재 확인" + (" (조문·취지는 원문 확인)" if it["kind"] == "statute" else " (판시 취지는 원문 확인)"))
    return items

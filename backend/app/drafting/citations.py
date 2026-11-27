"""초안의 인용을 허용 목록과 대조한다. 추출 규칙은 인용 실존 확인(app.core.citations)과 같은 것을 쓴다.

목록 밖 인용은 "틀렸다"는 뜻이 아니라 "변호사가 원문을 확인해야 한다"는 표시다.
"""

from app.core.citations import extract


def _key(ref: str) -> str:
    return ref.replace(" ", "")


def flag(text: str, allowed: tuple[str, ...] | list[str]) -> list[dict]:
    ok = {_key(it["ref"]) for a in allowed for it in extract(a)}
    return [{"kind": it["kind"], "ref": it["ref"]} for it in extract(text) if _key(it["ref"]) not in ok]

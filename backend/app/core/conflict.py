"""이해충돌 후보 대조. 이름 일치는 동명이인일 수 있으니 '후보'로만 보여주고 판단은 변호사가 한다."""

import re

from sqlalchemy import func, select
from sqlalchemy.orm import Session

# 법인 형태 표기는 대조에서 뺀다 — "(주)상대상사", "주식회사 상대상사", "상대상사 주식회사" 를 같은 이름으로 본다
_CORP = re.compile(r"\(주\)|㈜|\(유\)|\(합\)|주식회사|유한회사|유한책임회사|합자회사|합명회사|사단법인|재단법인|\(사\)|\(재\)")


def name_key(name: str | None) -> str | None:
    if not name:
        return None
    key = _CORP.sub("", name)
    key = re.sub(r"[\s·.,\-_()\[\]]", "", key).lower()
    return key or None


def find_conflicts(db: Session, case) -> list[dict]:
    from app.models.case import Case, CaseStatus
    from app.models.ops import ConflictParty
    from app.models.user import User

    out: list[dict] = []
    opp = case.opponent_key or name_key(case.opponent_name)
    client = name_key((case.intake or {}).get("client_name"))
    alive = Case.status != CaseStatus.CANCELED
    if opp:
        for x in db.scalars(select(Case).where(Case.id != case.id, Case.opponent_key == opp, alive)):
            out.append({"kind": "같은 상대방의 다른 사건", "case_id": x.id, "case_no": x.case_no, "name": x.opponent_name})
        for u in db.scalars(select(User).where(User.id != case.user_id, User.name.is_not(None))):
            if name_key(u.name) == opp:
                out.append({"kind": "상대방과 이름이 같은 회원", "user_id": u.id, "name": u.name})
        for p in db.scalars(select(ConflictParty).where(ConflictParty.key == opp)):
            out.append({"kind": f"법인 명단의 {p.role or '당사자'}(상대방과 일치)", "name": p.name, "note": p.note})
    if client:
        for x in db.scalars(select(Case).where(Case.id != case.id, Case.opponent_key == client, alive)):
            out.append({"kind": "이 의뢰인이 상대방인 다른 사건", "case_id": x.id, "case_no": x.case_no, "name": x.opponent_name})
        for p in db.scalars(select(ConflictParty).where(ConflictParty.key == client, func.coalesce(ConflictParty.role, "") != "의뢰인")):
            out.append({"kind": f"법인 명단의 {p.role or '당사자'}(의뢰인과 일치)", "name": p.name, "note": p.note})
    return out

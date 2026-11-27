"""지시문(system)과 입력(user) 조립.

입력에는 서면 작성에 필요한 것만 넣는다 — 의뢰인 연락처처럼 서면에 쓰지 않는 정보는 보내지 않는다(최소 처리).
"""

import json

from app.drafting.templates import DraftTemplate
from app.models.case import Case
from app.models.draft import DraftExemplar

SYSTEM = """당신은 한국 법무법인의 변호사를 돕는 서면 초안 작성 보조자입니다. 작성한 초안은 반드시 담당 변호사가 검토·수정한 뒤에만 쓰입니다.

지켜야 할 원칙:
1. 사실은 [사건 정보]와 [문진 답변]에 있는 것만 씁니다. 날짜·금액·이름·주소·장소를 지어내지 않습니다. 필요한데 없는 정보는 [확인 필요: 무엇이 필요한지] 형식으로 그 자리에 남깁니다.
2. 법령 조문과 판례 번호는 [인용 허용 목록]에 있는 것만 씁니다. 목록이 비어 있거나 목록에 맞는 근거가 없으면 번호를 쓰지 말고 [근거 법령 확인 필요]로 남깁니다.
3. [서면 구성]의 섹션 순서와 제목을 따릅니다. 섹션 제목은 한 줄에 따로 씁니다.
4. [예시 서면]은 문체·구성·표현 수준의 본보기입니다. 예시의 사실관계·이름·금액을 이 사건에 옮기지 않습니다.
5. 과장, 감정적 표현, 결과를 단정하거나 보장하는 표현을 쓰지 않습니다. 사실과 평가를 구분합니다.
6. 법원·수사기관에 내는 서면의 격식체(~합니다, ~입니다)로 씁니다.
7. 출력은 서면 본문만 씁니다. 설명, 머리말, 마크다운 표·코드블록은 쓰지 않습니다."""


def _case_info(c: Case) -> dict:
    intake = c.intake or {}
    info = {
        "상품": c.service_name,
        "의뢰인(신청인·고소인) 성명": intake.get("client_name"),
        "상대방 성명": c.opponent_name,
        "청구 금액(원)": c.claim_amount,
        "진행 방식": {"self": "의뢰인 본인 명의로 제출", "atty": "변호사 명의로 제출"}.get(c.track or "", c.track),
        "고소사실 수": c.units if c.service_slug == "complaint" else None,
    }
    return {k: v for k, v in info.items() if v not in (None, "")}


def build(c: Case, tpl: DraftTemplate, exemplars: list[DraftExemplar], base_text: str | None, extra_prompt: str | None) -> tuple[str, list[dict]]:
    intake = c.intake or {}
    parts: list[str] = []
    parts.append(f"[서면 종류]\n{tpl.title}\n\n[작성 지침]\n{tpl.instructions}")
    parts.append("[서면 구성]\n" + "\n".join(f"### {s.title}\n{s.guidance}" for s in tpl.sections))
    parts.append("[사건 정보]\n" + json.dumps(_case_info(c), ensure_ascii=False, indent=2))
    answers = intake.get("answers") or {}
    parts.append("[문진 답변]\n" + (json.dumps(answers, ensure_ascii=False, indent=2) if answers else "(없음)"))
    if intake.get("facts"):
        parts.append("[의뢰인이 적은 경위]\n" + str(intake["facts"]))
    if intake.get("screening"):
        parts.append("[접수 조건 확인 답변]\n" + json.dumps(intake["screening"], ensure_ascii=False))
    parts.append("[인용 허용 목록]\n" + ("\n".join(f"- {a}" for a in tpl.allowed_citations) if tpl.allowed_citations else "(비어 있음 — 조문·판례 번호를 쓰지 마세요)"))
    for i, ex in enumerate(exemplars, 1):
        parts.append(f"[예시 서면 {i}: {ex.title}]\n{ex.content}")
    if base_text:
        parts.append("[고쳐 쓸 이전 초안]\n아래 초안을 바탕으로, 원칙과 추가 지시에 맞게 고쳐 쓴 전체 본문을 다시 출력하세요.\n\n" + base_text)
    if extra_prompt:
        parts.append("[담당자 추가 지시]\n" + extra_prompt)
    parts.append("위 정보로 서면 초안 전체를 작성하세요.")
    return SYSTEM, [{"role": "user", "text": "\n\n".join(parts)}]

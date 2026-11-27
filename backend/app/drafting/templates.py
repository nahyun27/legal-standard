"""상품별 서면 템플릿 — 섹션 구성과 작성 지침.

※ 아래 내용은 모두 임시안(placeholder=True)이다. 담당 변호사의 서면 템플릿·서면별 설문지를 받으면
  같은 구조(섹션 key/title/guidance, 인용 허용 목록)로 바꿔 넣는다. 코드의 다른 곳은 고칠 필요가 없다.

allowed_citations: 이 서면에서 인용해도 되는 법령 조문·판례 번호(변호사가 정한 목록).
  비어 있으면 모델은 조문·판례 번호를 쓰지 않고 [근거 법령 확인 필요]로 남긴다. 목록 밖 인용은 생성 후 경고로 표시한다.
"""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Section:
    key: str
    title: str
    guidance: str


@dataclass(frozen=True)
class DraftTemplate:
    slug: str
    title: str
    instructions: str
    sections: tuple[Section, ...]
    allowed_citations: tuple[str, ...] = field(default_factory=tuple)
    placeholder: bool = True


_TEMPLATES: dict[str, DraftTemplate] = {
    "certified-letter": DraftTemplate(
        slug="certified-letter",
        title="내용증명",
        instructions="발신인이 수신인에게 채무 이행을 요구하는 통지서. 감정적 표현·위협 없이 사실과 요구만 적는다. 형사 고소를 암시하는 압박 문구는 쓰지 않는다.",
        sections=(
            Section("parties", "발신인·수신인", "성명과 주소. 문진에 없는 항목은 [확인 필요]로 둔다."),
            Section("title", "제목", "예: 대여금 반환 청구의 건"),
            Section("facts", "사실관계", "언제, 얼마를, 어떤 약정으로 건넸는지 시간 순서대로. 문진 답변에 있는 날짜·금액만 쓴다."),
            Section("demand", "요구 사항", "지급할 금액과 기한(문진의 '요구할 지급 기한'), 지급 방법(계좌는 [확인 필요])."),
            Section("notice", "불이행 시 조치", "기한까지 지급하지 않으면 법적 절차(지급명령 등)를 진행할 수 있다는 통지. 단정적 결과 예고는 쓰지 않는다."),
            Section("closing", "작성일·발신인", "작성일은 [확인 필요]로 둔다."),
        ),
    ),
    "payment-order": DraftTemplate(
        slug="payment-order",
        title="지급명령신청서",
        instructions="민사소송법상 독촉절차의 신청서. 청구취지와 청구원인을 법원 서식 순서로 적는다.",
        sections=(
            Section("parties", "당사자", "채권자·채무자의 성명, 주소, (아는 경우) 생년월일 또는 사업자번호."),
            Section("claim", "청구취지", "채무자는 채권자에게 금 ○원 및 이에 대한 지연손해금을 지급하라는 형식. 지연손해금 기산일·이율은 문진 답변에 있을 때만 쓰고, 없으면 [확인 필요]."),
            Section("cause", "청구원인", "채권 발생 원인(대여·물품·용역 등), 변제기, 일부 변제 여부, 독촉 경과(내용증명 발송 여부)를 번호를 붙여 순서대로."),
            Section("evidence", "소명자료", "문진의 증거 목록을 '1. 차용증 사본' 형식으로. 없는 자료를 만들어 넣지 않는다."),
            Section("closing", "신청일·신청인", "신청일과 관할 법원은 [확인 필요]로 둔다."),
        ),
    ),
    "complaint": DraftTemplate(
        slug="complaint",
        title="고소장",
        instructions="수사기관에 제출하는 고소장. 고소사실은 구성요건 요소(기망·처분행위·재산상 이익 등)가 드러나게 육하원칙으로 쓴다. 단정적 범죄 표현 대신 '~한 것으로 보입니다'처럼 사실과 평가를 구분한다.",
        sections=(
            Section("parties", "고소인·피고소인", "피고소인 인적사항을 모르면 '성명불상'으로 적고 문진의 특정 단서(연락처·계좌·아이디)를 함께 적는다."),
            Section("purpose", "고소취지", "피고소인을 ○○죄로 고소하니 처벌하여 달라는 형식. 죄명은 문진 답변의 사건 유형을 따른다."),
            Section("facts", "고소사실", "시간 순서대로, 날짜·장소·금액·방법을 문진에 있는 그대로."),
            Section("reasons", "고소이유", "고소에 이르게 된 경위와 피해 내용. 과장·추측을 쓰지 않는다."),
            Section("evidence", "증거자료", "문진의 증거 목록."),
            Section("closing", "작성일·제출처", "작성일과 관할 경찰서는 [확인 필요]로 둔다."),
        ),
    ),
}

GENERIC = DraftTemplate(
    slug="*",
    title="서면",
    instructions="이 상품의 전용 템플릿이 아직 없다. 일반적인 법률 서면 구성으로 쓰고, 서면 종류에 맞지 않는 부분은 [확인 필요]로 남긴다.",
    sections=(
        Section("parties", "당사자", "당사자의 성명·주소."),
        Section("purpose", "신청·청구 취지", "무엇을 구하는지."),
        Section("facts", "사실관계", "문진 답변을 시간 순서대로."),
        Section("reasons", "이유", "사실관계에서 취지가 나오는 이유."),
        Section("evidence", "첨부·증거", "문진의 증거 목록."),
    ),
)


def template_for(slug: str) -> DraftTemplate:
    return _TEMPLATES.get(slug, GENERIC)

"""고객 알림. 지금은 서버 로그로만 남긴다.
TODO: 카카오 알림톡(템플릿 심사 필요) → 실패 시 SMS, 이메일. 발송 이력도 남길 것."""

import logging

from app.models.case import Case
from app.models.user import User

logger = logging.getLogger("notify")

MESSAGES = {
    "paid": "[리걸스탠다드] {case_no} 접수·결제가 완료되었습니다. 담당 변호사가 24시간 내 수임 여부를 검토합니다.",
    "accepted": "[리걸스탠다드] {case_no} 수임이 확정되었습니다. 서면 준비를 시작합니다.",
    "rejected": "[리걸스탠다드] {case_no} 표준 서비스로 진행이 어려워 결제금액 전액을 환불했습니다. 사유는 내 사건에서 확인하실 수 있습니다.",
    "delivered": "[리걸스탠다드] {case_no} 서면 발송·제출이 완료되었습니다. 내 사건에서 서면과 다음 단계를 확인하세요.",
}


def notify(user: User, event: str, case: Case) -> None:
    text = MESSAGES[event].format(case_no=case.case_no)
    logger.info("notify user=%s phone=%s event=%s: %s", user.id, user.phone, event, text)

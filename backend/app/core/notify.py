"""고객 알림 — SMS(솔라피) → 이메일 순서로 보낸다. 설정된 채널이 없거나 실패해도 notifications 에 기록을 남긴다.
알림톡은 카카오 템플릿 심사가 끝나면 같은 업체 API 로 전환한다(문구가 템플릿과 글자 단위로 같아야 함)."""

import hashlib
import hmac
import logging
import secrets
import smtplib
from datetime import datetime, timezone
from email.message import EmailMessage

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.case import Case
from app.models.ops import Notification
from app.models.user import User

logger = logging.getLogger("notify")

MESSAGES = {
    "paid": "[리걸스탠다드] {case_no} 접수·결제가 완료되었습니다. 담당 변호사가 24시간 내 수임 여부를 검토합니다.",
    "accepted": "[리걸스탠다드] {case_no} 수임이 확정되었습니다. 서면 준비를 시작합니다.",
    "rejected": "[리걸스탠다드] {case_no} 표준 서비스로 진행이 어려워 결제금액 전액을 환불했습니다. 사유는 내 사건에서 확인하실 수 있습니다.",
    "delivered": "[리걸스탠다드] {case_no} 서면 발송·제출이 완료되었습니다. 내 사건에서 서면과 다음 단계를 확인하세요.",
    "reminder": "[리걸스탠다드] 작성하신 {service} 접수({case_no})가 결제 전 상태입니다. 내 사건에서 이어서 진행하실 수 있습니다.",
    "quoted": "[리걸스탠다드] {case_no} 견적이 준비되었습니다. 내 사건에서 금액과 안내를 확인해 주세요.",
}


def _solapi_auth() -> str:
    date = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    salt = secrets.token_hex(16)
    sig = hmac.new((settings.SOLAPI_API_SECRET or "").encode(), f"{date}{salt}".encode(), hashlib.sha256).hexdigest()
    return f"HMAC-SHA256 apiKey={settings.SOLAPI_API_KEY}, date={date}, salt={salt}, signature={sig}"


def _send_sms(to: str, text: str) -> None:
    res = httpx.post(
        "https://api.solapi.com/messages/v4/send",
        headers={"Authorization": _solapi_auth()},
        json={"message": {"to": to, "from": settings.SMS_SENDER, "text": text}},
        timeout=10.0,
    )
    if res.status_code >= 300:
        raise RuntimeError(f"SMS {res.status_code}: {res.text[:200]}")


def _send_email(to: str, text: str) -> None:
    msg = EmailMessage()
    msg["Subject"] = text.split("]", 1)[0] + "] 사건 진행 안내"
    msg["From"] = settings.SMTP_FROM or settings.SMTP_USER
    msg["To"] = to
    msg.set_content(text + "\n\n※ 본 메일은 발신 전용입니다.")
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as s:
        s.starttls()
        if settings.SMTP_USER:
            s.login(settings.SMTP_USER, settings.SMTP_PASSWORD or "")
        s.send_message(msg)


def notify(db: Session, user: User | None, event: str, case: Case) -> None:
    """알림을 보내고 결과를 기록한다. 알림 실패가 사건 처리를 막지는 않는다(호출한 쪽은 이미 커밋한 상태)."""
    if user is None:
        return
    text = MESSAGES[event].format(case_no=case.case_no, service=case.service_name)
    attempts: list[tuple[str, str | None, object]] = []
    if settings.SOLAPI_API_KEY and settings.SMS_SENDER and user.phone:
        attempts.append(("sms", user.phone, _send_sms))
    if settings.SMTP_HOST and user.email:
        attempts.append(("email", user.email, _send_email))

    if not attempts:
        logger.info("notify(skipped, no channel) user=%s event=%s: %s", user.id, event, text)
        db.add(Notification(user_id=user.id, case_id=case.id, event=event, channel="log", to=None, status="skipped", text=text,
                            error="발송 채널 미설정(SMS·이메일)"))
    for channel, to, send in attempts:
        try:
            send(to, text)  # type: ignore[operator]
            db.add(Notification(user_id=user.id, case_id=case.id, event=event, channel=channel, to=to, status="sent", text=text))
        except Exception as exc:  # noqa: BLE001 — 어떤 실패든 기록만 하고 넘어간다
            logger.warning("notify failed channel=%s user=%s: %s", channel, user.id, exc)
            db.add(Notification(user_id=user.id, case_id=case.id, event=event, channel=channel, to=to, status="failed", text=text, error=str(exc)[:500]))
    db.commit()

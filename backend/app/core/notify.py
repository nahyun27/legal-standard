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
    "retainer": "[리걸스탠다드] {case_no} 변호사에게 맡기신 사건은 전자 수임약정 서명이 필요합니다. 내 사건에서 내용을 확인하고 서명해 주세요.",
    "charge": "[리걸스탠다드] {case_no} 추가 요금(출석 등) 청구가 있습니다. 내 사건에서 일정과 금액을 확인해 주세요.",
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


def _deliver(to: str, subject: str, body: str) -> None:
    """메일 한 통을 보낸다. 실패하면 예외. SES 가 설정돼 있으면 SES, 아니면 SMTP."""
    body = body + "\n\n※ 본 메일은 발신 전용입니다."
    sender = settings.MAIL_FROM or settings.SMTP_FROM or settings.SMTP_USER
    if settings.SES_REGION:
        import boto3  # 운영에서만 필요 — 서버의 IAM 역할 자격 증명을 쓴다

        boto3.client("sesv2", region_name=settings.SES_REGION).send_email(
            FromEmailAddress=sender,
            Destination={"ToAddresses": [to]},
            Content={"Simple": {"Subject": {"Data": subject, "Charset": "UTF-8"}, "Body": {"Text": {"Data": body, "Charset": "UTF-8"}}}},
        )
        return
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = to
    msg.set_content(body)
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as s:
        s.starttls()
        if settings.SMTP_USER:
            s.login(settings.SMTP_USER, settings.SMTP_PASSWORD or "")
        s.send_message(msg)


def _send_email(to: str, text: str) -> None:
    _deliver(to, text.split("]", 1)[0] + "] 사건 진행 안내", text)


def send_mail(to: str, subject: str, body: str) -> bool:
    """사건과 무관한 계정 메일(비밀번호 재설정 등). 보내면 True. SMTP 가 없으면 보내지 않고 False —
    개발 환경에서는 내용을 로그에 남겨 링크를 확인할 수 있게 하고, 운영에서는 링크가 로그에 남지 않게 내용을 적지 않는다."""
    if not settings.mail_enabled:
        if settings.ENV == "production":
            logger.warning("send_mail skipped (메일 미설정) to=%s subject=%s", to, subject)
        else:
            logger.info("send_mail(dev, not sent) to=%s subject=%s\n%s", to, subject, body)
        return False
    try:
        _deliver(to, subject, body)
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("send_mail failed to=%s: %s", to, exc)
        return False


def notify(db: Session, user: User | None, event: str, case: Case) -> None:
    """알림을 보내고 결과를 기록한다. 알림 실패가 사건 처리를 막지는 않는다(호출한 쪽은 이미 커밋한 상태)."""
    if user is None:
        return
    text = MESSAGES[event].format(case_no=case.case_no, service=case.service_name)
    attempts: list[tuple[str, str | None, object]] = []
    if settings.SOLAPI_API_KEY and settings.SMS_SENDER and user.phone:
        attempts.append(("sms", user.phone, _send_sms))
    if settings.mail_enabled and user.email:
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

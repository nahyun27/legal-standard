"""결제 완료 처리 — 승인 API·웹훅·대조 작업이 모두 이 함수를 거친다(경로마다 처리가 달라지지 않게)."""

from sqlalchemy.orm import Session

from app.core.audit import record
from app.core.timeutil import now
from app.models.case import CaseStatus, Payment


def mark_paid(db: Session, p: Payment, *, payment_key: str, data: dict | None, via: str, actor_id: int | None) -> bool:
    """결제를 완료로 반영한다. 이미 반영됐으면 False. 금액이 서버 값과 다르면 반영하지 않고 예외."""
    c = p.case
    if p.status == "done":
        return False
    if data is not None and int(data.get("totalAmount", p.amount)) != p.amount:
        raise ValueError(f"결제 금액 불일치: 결제사 {data.get('totalAmount')} / 서버 {p.amount}")
    p.payment_key, p.status, p.approved_at = payment_key, "done", now()
    p.method = "시뮬레이션" if p.simulated else (data or {}).get("method")
    p.raw = data
    p.receipt_url = ((data or {}).get("receipt") or {}).get("url")
    if c.status == CaseStatus.PENDING_PAYMENT:
        c.status, c.paid_at = CaseStatus.REVIEWING, now()
    record(db, "payment.confirm", actor_id=actor_id, target_type="case", target_id=c.id,
           detail={"order_id": p.order_id, "amount": p.amount, "simulated": p.simulated, "via": via})
    return True

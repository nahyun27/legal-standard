from fastapi import Request
from sqlalchemy.orm import Session

from app.models.audit import AuditLog


def record(
    db: Session,
    action: str,
    *,
    actor_id: int | None,
    target_type: str | None = None,
    target_id: int | None = None,
    reason: str | None = None,
    detail: dict | None = None,
    request: Request | None = None,
) -> None:
    """감사 로그 한 줄을 세션에 추가한다. 커밋은 호출한 쪽의 조치와 함께 한 번에 한다(조치만 되고 기록이 빠지는 일이 없게)."""
    db.add(
        AuditLog(
            actor_id=actor_id, action=action, target_type=target_type, target_id=target_id,
            reason=reason, detail=detail, ip=request.client.host if request and request.client else None,
        )
    )

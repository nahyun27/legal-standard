from fastapi import Request
from sqlalchemy.orm import Session

from app.models.audit import AuditLog


def client_ip(request: Request | None) -> str | None:
    """접속자 IP. 프록시(Next 라우트 핸들러·Nginx)를 거친 X-Forwarded-For 는 uvicorn 이 신뢰 주소에서 온 것만 반영한다.
    IPv4 가 IPv6 형식(::ffff:1.2.3.4)으로 오면 IPv4 로 적는다."""
    host = request.client.host if request and request.client else None
    return host.removeprefix("::ffff:") if host else None


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
            reason=reason, detail=detail, ip=client_ip(request),
        )
    )

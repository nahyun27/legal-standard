"""토스페이먼츠 승인·취소. 시크릿 키가 없으면(settings.payment_simulated) 호출하지 않는다."""

import httpx
from fastapi import HTTPException, status

from app.core.config import settings


def _post(path: str, body: dict) -> dict:
    try:
        res = httpx.post(f"{settings.TOSS_API_BASE}{path}", auth=(settings.TOSS_SECRET_KEY or "", ""), json=body, timeout=15.0)
    except httpx.HTTPError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail="결제사와 통신하지 못했습니다. 잠시 후 다시 시도해 주세요.") from exc
    data = res.json() if res.content else {}
    if res.status_code != 200:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=data.get("message") or "결제 처리에 실패했습니다.")
    return data


def confirm(payment_key: str, order_id: str, amount: int) -> dict:
    return _post("/v1/payments/confirm", {"paymentKey": payment_key, "orderId": order_id, "amount": amount})


def cancel(payment_key: str, reason: str) -> dict:
    return _post(f"/v1/payments/{payment_key}/cancel", {"cancelReason": reason[:200]})


def get_by_order(order_id: str) -> dict | None:
    """orderId 로 결제 조회(웹훅·대조용). 결제가 없으면 None."""
    try:
        res = httpx.get(f"{settings.TOSS_API_BASE}/v1/payments/orders/{order_id}", auth=(settings.TOSS_SECRET_KEY or "", ""), timeout=15.0)
    except httpx.HTTPError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail="결제사와 통신하지 못했습니다.") from exc
    if res.status_code == 404:
        return None
    if res.status_code != 200:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail="결제 조회에 실패했습니다.")
    return res.json()

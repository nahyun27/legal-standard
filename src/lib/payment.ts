'use client';

import { api, type CaseDetail, type PaymentStart } from '@/lib/api';

/**
 * 결제 시작. 금액은 서버가 사건에 고정한 값만 쓴다.
 * - 시뮬레이션(서버에 토스 키 없음): 바로 승인 API 를 불러 결제완료 처리 → 사건 페이지로
 * - 실결제: 토스 결제창 → successUrl(/payments/success)에서 승인 API 호출
 * 반환값 'redirected' 면 토스 결제창으로 이동한 것이고, 'canceled' 면 사용자가 결제창을 닫은 것.
 */
export async function startPayment(caseId: number): Promise<CaseDetail | 'redirected' | 'canceled'> {
  const p = await api<PaymentStart>(`/cases/${caseId}/payment`, { method: 'POST' });
  if (p.simulated || !p.client_key) {
    return api<CaseDetail>('/payments/confirm', {
      method: 'POST',
      body: JSON.stringify({ order_id: p.order_id, payment_key: 'SIMULATED', amount: p.amount }),
    });
  }
  const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
  const toss = await loadTossPayments(p.client_key);
  const payment = toss.payment({ customerKey: p.customer_key });
  try {
    await payment.requestPayment({
      method: 'CARD',
      amount: { currency: 'KRW', value: p.amount },
      orderId: p.order_id,
      orderName: p.order_name,
      customerName: p.customer_name ?? undefined,
      customerMobilePhone: p.customer_phone ?? undefined,
      successUrl: `${window.location.origin}/payments/success?case=${caseId}`,
      failUrl: `${window.location.origin}/payments/fail?case=${caseId}`,
    });
    return 'redirected';
  } catch (err) {
    // 결제창을 X 로 닫으면 SDK 가 USER_CANCEL 을 던진다 — 실패가 아니라 정상 취소(KCPEC 2026-09 실사용 중 발견)
    if ((err as { code?: string }).code === 'USER_CANCEL') return 'canceled';
    throw err;
  }
}

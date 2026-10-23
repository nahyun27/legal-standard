'use client';

import { api, type CaseDetail, type PaymentStart } from '@/lib/api';

export type PayMethod = 'card' | 'kakaopay' | 'naverpay' | 'tosspay' | 'transfer';

export const PAY_METHODS: { value: PayMethod; label: string }[] = [
  { value: 'card', label: '신용·체크카드' },
  { value: 'kakaopay', label: '카카오페이' },
  { value: 'naverpay', label: '네이버페이' },
  { value: 'tosspay', label: '토스페이' },
  { value: 'transfer', label: '계좌이체' },
];

export interface Consents {
  agree_engagement: boolean;
  agree_withdrawal: boolean;
}

/**
 * 결제 시작. 금액은 서버가 사건에 고정한 값만 쓴다.
 * - 시뮬레이션(서버에 토스 키 없음): 바로 승인 API 를 불러 결제완료 처리
 * - 실결제: 토스 결제창 → successUrl(/payments/success)에서 승인 API 호출.
 *   결제창에서 결제 후 창을 닫아도 서버의 웹훅·대조 작업이 결제를 반영한다.
 * 반환 'redirected' = 결제창으로 이동, 'canceled' = 사용자가 결제창을 닫음.
 */
export async function startPayment(caseId: number, consents: Consents, method: PayMethod = 'card'): Promise<CaseDetail | 'redirected' | 'canceled'> {
  const p = await api<PaymentStart>(`/cases/${caseId}/payment`, { method: 'POST', body: JSON.stringify(consents) });
  if (p.simulated || !p.client_key) {
    return api<CaseDetail>('/payments/confirm', {
      method: 'POST',
      body: JSON.stringify({ order_id: p.order_id, payment_key: 'SIMULATED', amount: p.amount }),
    });
  }
  const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
  const toss = await loadTossPayments(p.client_key);
  const payment = toss.payment({ customerKey: p.customer_key });
  // 간편결제는 별도 method 가 아니라 CARD + card.flowMode DIRECT + easyPay 로 보낸다(토스 SDK v2 — KCPEC 2026-09 확인)
  const easyPay = { kakaopay: 'KAKAOPAY', naverpay: 'NAVERPAY', tosspay: 'TOSSPAY' }[method as string];
  const tossMethod = method === 'transfer' ? 'TRANSFER' : 'CARD';
  try {
    await payment.requestPayment({
      method: tossMethod,
      amount: { currency: 'KRW', value: p.amount },
      orderId: p.order_id,
      orderName: p.order_name,
      customerName: p.customer_name ?? undefined,
      customerMobilePhone: p.customer_phone ?? undefined,
      successUrl: `${window.location.origin}/payments/success?case=${caseId}`,
      failUrl: `${window.location.origin}/payments/fail?case=${caseId}`,
      ...(easyPay ? { card: { flowMode: 'DIRECT', easyPay } } : {}),
      // 계좌이체는 현금영수증 발급 대상(변호사업 = 현금영수증 의무발행업종) — 토스 결제창에서 발급 정보를 받는다
      ...(tossMethod === 'TRANSFER' ? { transfer: { cashReceipt: { type: '소득공제' }, useEscrow: false } } : {}),
    } as unknown as Parameters<typeof payment.requestPayment>[0]);
    return 'redirected';
  } catch (err) {
    // 결제창을 X 로 닫으면 SDK 가 USER_CANCEL 을 던진다 — 실패가 아니라 정상 취소(KCPEC 2026-09 실사용 중 발견)
    if ((err as { code?: string }).code === 'USER_CANCEL') return 'canceled';
    throw err;
  }
}

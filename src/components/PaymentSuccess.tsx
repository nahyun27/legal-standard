'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { api, type CaseDetail } from '@/lib/api';

/** 토스 결제창 성공 복귀 — 서버 승인 API 를 불러 결제를 확정한다(금액은 서버가 다시 대조). */
export default function PaymentSuccess({ caseId, paymentKey, orderId, amount }: { caseId: string; paymentKey: string; orderId: string; amount: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return; // 개발 모드 이중 실행으로 승인이 두 번 나가지 않게
    once.current = true;
    if (!paymentKey || !orderId) { setError('결제 정보가 없습니다.'); return; }
    api<CaseDetail>('/payments/confirm', { method: 'POST', body: JSON.stringify({ order_id: orderId, payment_key: paymentKey, amount: Number(amount) }) })
      .then((c) => {
        try { sessionStorage.removeItem(`intake:${c.service_slug}`); } catch {}
        router.replace(`/my/cases/${c.id}?paid=1`);
      })
      .catch((e) => setError((e as Error).message));
  }, [paymentKey, orderId, amount, router]);

  return (
    <div className="container auth-wrap">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        {error ? (
          <div className="status-screen">
            <span className="status-icon err"><AlertCircle size={30} /></span>
            <h1 className="auth-title">결제를 확인하지 못했습니다</h1>
            <p className="form-error" style={{ margin: '16px 0' }}>{error}</p>
            <Link href={caseId ? `/my/cases/${caseId}` : '/my'} className="btn btn-primary">내 사건으로</Link>
          </div>
        ) : (
          <div className="status-screen">
            <div className="spinner" />
            <p className="sub" style={{ marginTop: 16 }}>결제를 확인하고 있습니다…</p>
          </div>
        )}
      </div>
    </div>
  );
}

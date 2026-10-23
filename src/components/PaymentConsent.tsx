'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PAY_METHODS, type Consents, type PayMethod } from '@/lib/payment';

/** 결제 전 필수 동의(수임 조건·청약철회 제한 고지)와 결제수단 선택. 문안은 서버가 내려준다(버전 관리). */
export default function PaymentConsent({ value, onChange, method, onMethod }: {
  value: Consents; onChange: (v: Consents) => void; method: PayMethod; onMethod: (m: PayMethod) => void;
}) {
  const [items, setItems] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    api<{ items: Record<string, string> }>('/consents/payment', {}, false).then((r) => setItems(r.items)).catch(() => setItems({}));
  }, []);
  if (!items) return null;
  const keys = Object.keys(items) as (keyof Consents)[];
  const all = keys.every((k) => value[k]);
  return (
    <div className="pay-box">
      <div className="pay-methods" role="radiogroup" aria-label="결제수단">
        {PAY_METHODS.map((m) => (
          <button key={m.value} type="button" role="radio" aria-checked={method === m.value} className={method === m.value ? 'on' : ''} onClick={() => onMethod(m.value)}>
            {m.label}
          </button>
        ))}
      </div>
      <div className="consents" style={{ margin: '12px 0 0' }}>
        <label className="consent consent-all">
          <input type="checkbox" checked={all} onChange={(e) => onChange({ agree_engagement: e.target.checked, agree_withdrawal: e.target.checked })} />
          <span>결제 전 안내에 모두 동의합니다</span>
        </label>
        {keys.map((k) => (
          <label key={k} className="consent consent-long">
            <input type="checkbox" checked={value[k]} onChange={(e) => onChange({ ...value, [k]: e.target.checked })} />
            <span><em className="req">[필수]</em> {items[k]}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

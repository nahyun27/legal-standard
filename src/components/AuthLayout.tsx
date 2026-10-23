import { Check } from 'lucide-react';
import { TrustSeal } from '@/components/ui';
import { FIRM } from '@/lib/site';

const POINTS = ['상담·수임·서면 확정은 모두 법인 소속 변호사가', '다음 단계까지 가격을 미리 공개하는 정찰제', '수임이 확정되지 않으면 결제금액 전액 반환'];

/** 로그인·가입 화면 틀 — 왼쪽 신뢰 패널, 오른쪽 폼. 모바일에서는 폼만 보인다. */
export default function AuthLayout({ children, step }: { children: React.ReactNode; step?: 1 | 2 | 3 }) {
  return (
    <div className="auth-split">
      <aside className="auth-brand">
        <div className="auth-brand-inner">
          <span className="eyebrow">{FIRM.brand}</span>
          <h2>법무법인이 직접 운영하는<br />정찰제 법률서비스</h2>
          <ul>{POINTS.map((p) => <li key={p}><Check size={16} />{p}</li>)}</ul>
          <TrustSeal />
        </div>
      </aside>
      <div className="auth-main">
        {step && (
          <ol className="auth-steps" aria-label="가입 단계">
            {['로그인', '가입 정보', '완료'].map((label, i) => (
              <li key={label} className={i + 1 < step ? 'done' : i + 1 === step ? 'now' : ''}><span>{i + 1 < step ? '✓' : i + 1}</span>{label}</li>
            ))}
          </ol>
        )}
        {children}
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { CONSENTS, type Consent } from '@/data/consents';
import { api, formatPhone, safeNext, type User } from '@/lib/api';

type Agreements = Record<Consent['key'], boolean>;

/** 가입 마무리 — 소셜 로그인으로 계정이 생긴 뒤, 필수 약관 동의와 실명·연락처를 받는다. */
export default function SignupForm({ next }: { next?: string }) {
  const router = useRouter();
  const { user, ready, setUser } = useAuth();
  const target = safeNext(next);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [agree, setAgree] = useState<Agreements>({ agree_terms: false, agree_privacy: false, marketing_consent: false });
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent(`/signup?next=${target}`)}`);
    else if (user.is_onboarded) router.replace(target);
  }, [ready, user, router, target]);

  const all = CONSENTS.every((c) => agree[c.key]);
  const requiredOk = CONSENTS.filter((c) => c.required).every((c) => agree[c.key]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!requiredOk) { setError('필수 약관에 동의해 주세요.'); return; }
    setBusy(true);
    setError(null);
    try {
      const me = await api<User>('/auth/me/onboarding', {
        method: 'POST',
        body: JSON.stringify({ name, phone, ...agree }),
      });
      setUser(me);
      router.replace(target);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  if (!ready || !user || user.is_onboarded) return <div className="auth-card"><div className="spinner" /></div>;

  return (
    <form className="auth-card" onSubmit={submit} noValidate>
      <span className="eyebrow">Sign up</span>
      <h1 className="auth-title">가입을 마무리해 주세요</h1>
      <p className="sub" style={{ marginBottom: 24 }}>
        사건을 맡기실 때 수임계약과 이해충돌 확인에 실명과 연락처가 필요합니다.
      </p>

      <div className="field">
        <label htmlFor="name">이름 (실명)</label>
        <input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required maxLength={50} />
      </div>
      <div className="field">
        <label htmlFor="phone">휴대폰 번호</label>
        <input
          id="phone" value={phone} inputMode="numeric" autoComplete="tel" placeholder="010-0000-0000" required
          onChange={(e) => setPhone(formatPhone(e.target.value.replace(/\D/g, '').slice(0, 11)) || e.target.value.replace(/\D/g, ''))}
        />
        <span className="hint">진행 상황 안내와 담당 변호사 연락에 사용합니다.</span>
      </div>

      <div className="consents">
        <label className="consent consent-all">
          <input type="checkbox" checked={all} onChange={(e) => setAgree({ agree_terms: e.target.checked, agree_privacy: e.target.checked, marketing_consent: e.target.checked })} />
          <span>전체 동의</span>
        </label>
        {CONSENTS.map((c) => (
          <div key={c.key} className="consent-row">
            <label className="consent">
              <input type="checkbox" checked={agree[c.key]} onChange={(e) => setAgree({ ...agree, [c.key]: e.target.checked })} />
              <span>
                <em className={c.required ? 'req' : 'opt'}>{c.required ? '[필수]' : '[선택]'}</em> {c.label}
              </span>
            </label>
            {c.detail ? (
              <button type="button" className="consent-toggle" aria-expanded={open === c.key} onClick={() => setOpen(open === c.key ? null : c.key)}>
                보기 <ChevronDown size={14} />
              </button>
            ) : c.href ? (
              <Link href={c.href} target="_blank" className="consent-toggle">전문</Link>
            ) : null}
            {open === c.key && c.detail && (
              <ul className="consent-detail">
                {c.detail.map((d) => <li key={d}>{d}</li>)}
                {c.href && <li><Link href={c.href} target="_blank">전문 보기</Link></li>}
              </ul>
            )}
          </div>
        ))}
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 8 }} disabled={busy || !requiredOk}>
        {busy ? '처리 중…' : '가입 완료'}
      </button>
    </form>
  );
}

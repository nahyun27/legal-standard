'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { api, safeNext, socialLoginUrl, type Providers, type User } from '@/lib/api';
import { FIRM } from '@/lib/site';

const PROVIDER_NAME: Record<string, string> = { kakao: '카카오', naver: '네이버' };

function errorText(error?: string, provider?: string, message?: string) {
  const who = provider ? PROVIDER_NAME[provider] ?? provider : '소셜';
  switch (error) {
    case undefined: return null;
    case 'not_configured': return `${who} 로그인은 준비 중입니다.`;
    case 'cancelled': return `${who} 로그인을 취소했습니다.`;
    case 'invalid_state': return '로그인 요청이 만료되었습니다. 다시 시도해 주세요.';
    default: return message || `${who} 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.`;
  }
}

/** 로그인 = 회원가입. 처음 로그인하면 계정이 만들어지고, 가입 마무리(/signup)로 이어진다. */
export default function LoginPanel({ next, error, provider, message }: { next?: string; error?: string; provider?: string; message?: string }) {
  const router = useRouter();
  const { user, ready, offline, setUser } = useAuth();
  const target = safeNext(next);
  const [providers, setProviders] = useState<Providers | null>(null);
  const [devName, setDevName] = useState('');
  const [busy, setBusy] = useState(false);
  const [devError, setDevError] = useState<string | null>(null);

  useEffect(() => {
    api<Providers>('/auth/providers').then(setProviders).catch(() => setProviders({ kakao: false, naver: false, dev: false }));
  }, []);

  // 이미 로그인된 상태로 들어오면 바로 보낸다
  useEffect(() => {
    if (ready && user) router.replace(user.is_onboarded ? target : `/signup?next=${encodeURIComponent(target)}`);
  }, [ready, user, router, target]);

  async function devLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setDevError(null);
    try {
      setUser(await api<User>('/auth/dev-login', { method: 'POST', body: JSON.stringify({ name: devName }) }));
    } catch (err) {
      setDevError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const err = errorText(error, provider, message);

  return (
    <div className="auth-card">
      <span className="eyebrow">Login</span>
      <h1 className="auth-title">로그인 / 회원가입</h1>
      <p className="sub" style={{ marginBottom: 24 }}>
        처음이시면 로그인과 동시에 가입이 시작됩니다. 사건 접수·결제와 진행 조회에 필요합니다.
      </p>

      {err && <p className="form-error" role="alert">{err}</p>}
      {offline && <p className="form-error" role="alert">서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.</p>}

      <div className="social-buttons">
        <SocialButton provider="kakao" enabled={!!providers?.kakao} href={socialLoginUrl('kakao', target)} />
        <SocialButton provider="naver" enabled={!!providers?.naver} href={socialLoginUrl('naver', target)} />
      </div>

      {providers?.dev && (
        <form className="dev-login" onSubmit={devLogin}>
          <div className="dev-login-label">개발용 로그인 <span>운영 환경에서는 표시되지 않습니다</span></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={devName} onChange={(e) => setDevName(e.target.value)} placeholder="아무 이름 (같은 이름 = 같은 계정)" required maxLength={30} />
            <button className="btn btn-ghost" disabled={busy}>로그인</button>
          </div>
          {devError && <p className="form-error" style={{ marginTop: 8 }}>{devError}</p>}
        </form>
      )}

      <p className="auth-foot">
        로그인하면 {FIRM.brand}의 <Link href="/terms">이용약관</Link>과 <Link href="/privacy">개인정보처리방침</Link>을
        확인하는 가입 단계로 이어집니다. 운영: {FIRM.name}
      </p>
    </div>
  );
}

function SocialButton({ provider, enabled, href }: { provider: 'kakao' | 'naver'; enabled: boolean; href: string }) {
  const label = `${PROVIDER_NAME[provider]}로 계속하기`;
  const icon = provider === 'kakao' ? (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3C6.48 3 2 6.5 2 10.82c0 2.78 1.86 5.22 4.66 6.6l-.95 3.48c-.08.3.26.54.52.37l4.13-2.73c.54.06 1.08.1 1.64.1 5.52 0 10-3.5 10-7.82S17.52 3 12 3z" /></svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.27 12.85 7.38 0H0v24h7.73V11.15L16.62 24H24V0h-7.73z" /></svg>
  );
  if (!enabled) {
    return (
      <span className={`social-btn ${provider} disabled`} aria-disabled="true">
        {icon}{label}<small>준비 중</small>
      </span>
    );
  }
  return <a className={`social-btn ${provider}`} href={href}>{icon}{label}</a>;
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { api, safeNext, type User } from '@/lib/api';
import { FIRM } from '@/lib/site';

/** 백엔드 app/core/passwords.py 와 같은 기준(최소 길이). 나머지 규칙(흔한 비밀번호 등)은 서버가 알려 준다. */
const MIN = 10;
const RULE = `${MIN}자 이상. 너무 쉬운 비밀번호나 이메일 아이디가 들어간 비밀번호는 쓸 수 없습니다.`;

function PasswordPair({ value, confirm, onValue, onConfirm, label = '비밀번호' }: {
  value: string; confirm: string; onValue: (v: string) => void; onConfirm: (v: string) => void; label?: string;
}) {
  const mismatch = confirm.length > 0 && confirm !== value;
  return (
    <>
      <div className="field">
        <label htmlFor="pw-new">{label}</label>
        <input id="pw-new" type="password" autoComplete="new-password" value={value} onChange={(e) => onValue(e.target.value)} required minLength={MIN} maxLength={128} />
        <span className="hint">{RULE}</span>
      </div>
      <div className="field">
        <label htmlFor="pw-confirm">{label} 확인</label>
        <input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => onConfirm(e.target.value)} required maxLength={128} aria-invalid={mismatch} />
        {mismatch && <span className="hint" style={{ color: '#b4271a' }}>두 비밀번호가 다릅니다.</span>}
      </div>
    </>
  );
}

/** 이메일·비밀번호 가입 — 계정을 만들고 바로 로그인한 뒤 가입 마무리(실명·연락처·약관)로 보낸다. */
export function RegisterPanel({ next }: { next?: string }) {
  const router = useRouter();
  const { user, ready, setUser } = useAuth();
  const target = safeNext(next);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && user) router.replace(user.is_onboarded ? target : `/signup?next=${encodeURIComponent(target)}`);
  }, [ready, user, router, target]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== pw2) return setError('두 비밀번호가 다릅니다.');
    setBusy(true);
    setError(null);
    try {
      setUser(await api<User>('/auth/password/register', { method: 'POST', body: JSON.stringify({ email, password: pw }) }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-card">
      <h1 className="auth-title">이메일로 가입</h1>
      <p className="sub" style={{ marginBottom: 24 }}>이메일이 로그인 아이디가 됩니다. 비밀번호를 잊으면 이 주소로 재설정 링크를 보내 드립니다.</p>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="reg-email">이메일</label>
          <input id="reg-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} />
        </div>
        <PasswordPair value={pw} confirm={pw2} onValue={setPw} onConfirm={setPw2} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>가입하고 계속하기</button>
      </form>
      <p className="auth-foot">
        이미 가입하셨나요? <Link href={`/login${target !== '/' ? `?next=${encodeURIComponent(target)}` : ''}`}>로그인</Link>.
        다음 단계에서 {FIRM.brand}의 <Link href="/terms">이용약관</Link>과 <Link href="/privacy">개인정보처리방침</Link> 동의를 받습니다.
      </p>
    </div>
  );
}

/** 비밀번호 찾기 — 가입 여부와 상관없이 같은 안내를 보여 준다(서버도 같은 응답). */
export function ForgotPanel() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/auth/password/forgot', { method: 'POST', body: JSON.stringify({ email }) });
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-card">
      <h1 className="auth-title">비밀번호 찾기</h1>
      {sent ? (
        <>
          <p className="sub" style={{ marginBottom: 16 }}>
            <b>{email}</b> 으로 가입된 계정이 있으면 비밀번호 재설정 링크를 보냈습니다. 링크는 30분 동안 한 번만 쓸 수 있습니다.
          </p>
          <p className="sub">메일이 오지 않으면 스팸함을 확인하시거나 {FIRM.email} 로 문의해 주세요.</p>
          <p className="auth-foot"><Link href="/login">로그인으로 돌아가기</Link></p>
        </>
      ) : (
        <form onSubmit={submit}>
          <p className="sub" style={{ marginBottom: 20 }}>가입한 이메일을 입력하면 새 비밀번호를 정하는 링크를 보내 드립니다.</p>
          <div className="field">
            <label htmlFor="forgot-email">이메일</label>
            <input id="forgot-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} />
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={busy}>재설정 링크 받기</button>
          <p className="auth-foot">카카오·네이버로 가입하셨다면 해당 서비스의 로그인을 이용해 주세요. <Link href="/login">로그인으로</Link></p>
        </form>
      )}
    </div>
  );
}

/** 메일 링크로 들어와 새 비밀번호를 정한다. 다른 기기의 로그인은 모두 끊기고, 새 비밀번호로 다시 로그인한다. */
export function ResetPanel({ token }: { token?: string }) {
  const { setUser } = useAuth();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(token ? null : '링크가 올바르지 않습니다. 메일의 링크를 다시 눌러 주세요.');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== pw2) return setError('두 비밀번호가 다릅니다.');
    setBusy(true);
    setError(null);
    try {
      await api('/auth/password/reset', { method: 'POST', body: JSON.stringify({ token, password: pw }) });
      setUser(null);
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-card">
      <h1 className="auth-title">새 비밀번호 정하기</h1>
      {done ? (
        <>
          <p className="sub" style={{ marginBottom: 20 }}>비밀번호를 바꿨습니다. 다른 기기의 로그인은 모두 해제되었습니다.</p>
          <Link href="/login" className="btn btn-primary btn-block">새 비밀번호로 로그인</Link>
        </>
      ) : (
        <form onSubmit={submit}>
          <PasswordPair value={pw} confirm={pw2} onValue={setPw} onConfirm={setPw2} label="새 비밀번호" />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={busy || !token}>비밀번호 바꾸기</button>
          <p className="auth-foot">링크가 만료됐다면 <Link href="/forgot-password">비밀번호 찾기</Link>를 다시 해 주세요.</p>
        </form>
      )}
    </div>
  );
}

/** 내 정보의 비밀번호 변경(이메일 가입 계정만). */
export function ChangePasswordForm() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== pw2) return setMsg({ ok: false, text: '두 비밀번호가 다릅니다.' });
    setBusy(true);
    setMsg(null);
    try {
      await api('/auth/password/change', { method: 'POST', body: JSON.stringify({ current_password: current, new_password: pw }) });
      setMsg({ ok: true, text: '비밀번호를 바꿨습니다. 다른 기기의 로그인은 해제되었습니다.' });
      setCurrent(''); setPw(''); setPw2(''); setOpen(false);
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 14 }}>
      {msg && <p className={msg.ok ? 'sub' : 'form-error'} role="status">{msg.text}</p>}
      {open ? (
        <form onSubmit={submit} className="pw-change">
          <div className="field">
            <label htmlFor="pw-current">현재 비밀번호</label>
            <input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required maxLength={128} />
          </div>
          <PasswordPair value={pw} confirm={pw2} onValue={setPw} onConfirm={setPw2} label="새 비밀번호" />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" disabled={busy}>바꾸기</button>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>취소</button>
          </div>
        </form>
      ) : (
        <button className="link-btn" onClick={() => setOpen(true)}>비밀번호 변경</button>
      )}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { BarChart3, ClipboardList, ExternalLink, LayoutDashboard, LogOut, Receipt, ScrollText, Settings, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { ReasonProvider } from '@/components/admin/ReasonDialog';
import { api } from '@/lib/api';

export interface Staff {
  id: number;
  name: string;
  is_admin: boolean;
  is_lawyer: boolean;
  mfa_required: boolean;
  mfa_enabled: boolean;
  mfa_passed: boolean;
  mfa_method: 'totp' | 'email' | null;
  mfa_email: string | null;
}

const StaffContext = createContext<{ staff: Staff; reload: () => void } | null>(null);
export const useStaff = () => useContext(StaffContext)!.staff;
export const useStaffReload = () => useContext(StaffContext)!.reload;

const NAV = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard, exact: true },
  { href: '/admin/cases', label: '사건', icon: ClipboardList },
  { href: '/admin/payments', label: '주문·결제', icon: Receipt, adminOnly: true },
  { href: '/admin/stats', label: '통계', icon: BarChart3, adminOnly: true },
  { href: '/admin/users', label: '회원', icon: Users, adminOnly: true },
  { href: '/admin/audit', label: '감사 로그', icon: ScrollText, adminOnly: true },
  { href: '/admin/settings', label: '설정', icon: Settings },
];

/** 관리자 화면 틀. 직원(관리자·변호사)이 아니면 존재를 드러내지 않고 404 화면만 보여준다(서버도 404).
 * 2단계 인증이 요구되면(운영 환경은 항상) 등록·확인을 마칠 때까지 다른 화면을 열지 않는다. */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready, logout } = useAuth();
  const [staff, setStaff] = useState<Staff | null | 'denied'>(null);
  // 로그아웃으로 user 가 비는 순간 아래 "비로그인이면 /login" 이 먼저 돌아 홈 대신 로그인 화면으로 가는 것을 막는다
  const leaving = useRef(false);

  const load = useCallback(() => {
    api<Staff>('/admin/me').then(setStaff).catch(() => setStaff('denied'));
  }, []);

  useEffect(() => {
    if (!ready || leaving.current) return;
    if (!user) { router.replace(`/login?next=${encodeURIComponent(pathname)}`); return; }
    load();
  }, [ready, user, pathname, router, load]);

  if (staff === 'denied') {
    return (
      <main className="container section" style={{ textAlign: 'center', paddingTop: 120 }}>
        <h1>페이지를 찾을 수 없습니다</h1>
        <p className="lead" style={{ margin: '14px auto 24px' }}>주소를 다시 확인해 주세요.</p>
        <Link href="/" className="btn btn-primary">홈으로</Link>
      </main>
    );
  }
  if (!staff) return <main className="admin-loading"><div className="spinner" /></main>;

  const signOut = async () => { leaving.current = true; await logout(); router.replace('/'); };
  const needMfa = staff.mfa_required && (!staff.mfa_enabled || !staff.mfa_passed);
  if (needMfa) return <MfaGate staff={staff} onDone={load} onSignOut={signOut} />;

  const roles = [staff.is_admin && '관리자', staff.is_lawyer && '변호사'].filter(Boolean).join(' · ');

  return (
    <StaffContext.Provider value={{ staff, reload: load }}>
      <ReasonProvider>
        <div className="admin">
          <aside className="admin-side">
            <Link href="/admin" className="admin-brand"><span className="dot" aria-hidden="true" />리걸스탠다드<small>관리자</small></Link>
            <nav>
              {NAV.filter((n) => !n.adminOnly || staff.is_admin).map(({ href, label, icon: Icon, exact }) => {
                const active = exact ? pathname === href : pathname.startsWith(href);
                return (
                  <Link key={href} href={href} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>
                    <Icon size={17} />{label}
                  </Link>
                );
              })}
            </nav>
            <div className="admin-me">
              <b>{staff.name}</b><small>{roles}{staff.mfa_enabled ? ' · 2단계 인증' : ''}</small>
              <div className="admin-me-actions">
                <Link href="/" target="_blank"><ExternalLink size={14} /> 사이트</Link>
                <button onClick={signOut}><LogOut size={14} /> 로그아웃</button>
              </div>
            </div>
          </aside>
          <main className="admin-main">{children}</main>
        </div>
      </ReasonProvider>
    </StaffContext.Provider>
  );
}

/** 2단계 인증 등록 또는 확인. 방식은 인증 앱(QR) 또는 이메일 코드. 설정 화면의 자발적 등록에서도 MfaSetup 을 쓴다. */
function MfaGate({ staff, onDone, onSignOut }: { staff: Staff; onDone: () => void; onSignOut: () => void }) {
  return (
    <main className="container auth-wrap" style={{ paddingTop: 80 }}>
      <div className="auth-card">
        <span className="eyebrow"><ShieldCheck size={14} style={{ verticalAlign: -2 }} /> 2단계 인증</span>
        {!staff.mfa_enabled ? <MfaSetup email={staff.mfa_email} onDone={onDone} />
          : staff.mfa_method === 'email' ? <MfaEmail email={staff.mfa_email} onDone={onDone} />
          : <MfaVerify onDone={onDone} />}
        <button className="link-btn" style={{ marginTop: 16 }} onClick={onSignOut}>다른 계정으로 로그인</button>
      </div>
    </main>
  );
}

export function MfaSetup({ email, onDone }: { email: string | null; onDone: () => void }) {
  const [method, setMethod] = useState<'app' | 'email'>('app');
  return (
    <>
      <h1 className="auth-title">2단계 인증을 등록해 주세요</h1>
      <p className="sub" style={{ marginBottom: 14 }}>관리자 화면은 회원 정보와 사건 자료를 볼 수 있어 로그인 외에 한 번 더 확인합니다. 편한 방식을 고르세요.</p>
      <div className="tabs mfa-tabs" role="tablist" aria-label="인증 방식">
        <button type="button" role="tab" aria-selected={method === 'app'} className={method === 'app' ? 'on' : ''} onClick={() => setMethod('app')}>인증 앱</button>
        <button type="button" role="tab" aria-selected={method === 'email'} className={method === 'email' ? 'on' : ''} onClick={() => setMethod('email')} disabled={!email}>이메일로 코드 받기</button>
      </div>
      {method === 'app' ? <MfaAppSetup onDone={onDone} /> : <MfaEmail email={email} onDone={onDone} enroll />}
    </>
  );
}

function MfaAppSetup({ onDone }: { onDone: () => void }) {
  const [qr, setQr] = useState<{ qr_svg: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api<{ qr_svg: string; secret: string }>('/admin/mfa/setup', { method: 'POST' }).then(setQr).catch((e) => setError((e as Error).message)); }, []);
  async function enable(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try { await api('/admin/mfa/enable', { method: 'POST', body: JSON.stringify({ code }) }); onDone(); }
    catch (err) { setError((err as Error).message); }
  }
  return (
    <form onSubmit={enable}>
      <p className="sub" style={{ marginBottom: 16 }}>Google Authenticator 등 인증 앱으로 QR 코드를 찍은 뒤 앱에 뜨는 6자리 코드를 입력하세요.</p>
      {qr ? (
        <div className="mfa-qr">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr.qr_svg} alt="인증 앱 등록용 QR 코드" width={180} height={180} />
          <small>QR을 찍을 수 없으면 직접 입력: <code>{qr.secret}</code></small>
        </div>
      ) : !error && <div className="spinner" />}
      <MfaInput code={code} setCode={setCode} />
      {error && <p className="form-error">{error}</p>}
      <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={code.length !== 6}>등록 완료</button>
    </form>
  );
}

function MfaVerify({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try { await api('/admin/mfa/verify', { method: 'POST', body: JSON.stringify({ code }) }); onDone(); }
    catch (err) { setError((err as Error).message); setCode(''); }
  }
  return (
    <form onSubmit={verify}>
      <h1 className="auth-title">인증 코드를 입력해 주세요</h1>
      <p className="sub" style={{ marginBottom: 16 }}>인증 앱에 표시된 6자리 코드입니다. 확인 후 12시간 동안 유지됩니다.</p>
      <MfaInput code={code} setCode={setCode} autoFocus />
      {error && <p className="form-error">{error}</p>}
      <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={code.length !== 6}>확인</button>
    </form>
  );
}

/** 이메일 코드 — 등록(enroll)과 매번의 확인이 같은 화면. 코드는 10분 유효, 새로 받으면 이전 코드는 못 쓴다. */
function MfaEmail({ email, onDone, enroll }: { email: string | null; onDone: () => void; enroll?: boolean }) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  async function send() {
    setError(null); setSending(true);
    try { setSentTo((await api<{ sent_to: string }>('/admin/mfa/email/send', { method: 'POST' })).sent_to); setCode(''); }
    catch (err) { setError((err as Error).message); }
    finally { setSending(false); }
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try { await api('/admin/mfa/email/verify', { method: 'POST', body: JSON.stringify({ code }) }); onDone(); }
    catch (err) { setError((err as Error).message); setCode(''); }
  }
  return (
    <form onSubmit={verify}>
      {!enroll && <h1 className="auth-title">이메일 인증 코드를 입력해 주세요</h1>}
      <p className="sub" style={{ marginBottom: 16 }}>
        {sentTo ? <><b>{sentTo}</b> 로 6자리 코드를 보냈습니다. 10분 안에 입력하세요. 메일이 안 보이면 스팸함도 확인해 주세요.</>
          : <>가입한 이메일{email ? ` (${email})` : ''}로 6자리 코드를 보내 드립니다.{!enroll && ' 확인 후 12시간 동안 유지됩니다.'}</>}
      </p>
      {sentTo ? (
        <>
          <MfaInput code={code} setCode={setCode} autoFocus />
          {error && <p className="form-error">{error}</p>}
          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={code.length !== 6}>{enroll ? '등록 완료' : '확인'}</button>
          <button type="button" className="link-btn" style={{ marginTop: 10 }} onClick={send} disabled={sending}>코드 다시 받기</button>
        </>
      ) : (
        <>
          {error && <p className="form-error">{error}</p>}
          <button type="button" className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={send} disabled={sending}>{sending ? '보내는 중…' : '인증 코드 보내기'}</button>
        </>
      )}
    </form>
  );
}

function MfaInput({ code, setCode, autoFocus }: { code: string; setCode: (v: string) => void; autoFocus?: boolean }) {
  return (
    <div className="field">
      <label htmlFor="mfa">6자리 코드</label>
      <input id="mfa" className="mfa-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric" autoComplete="one-time-code" autoFocus={autoFocus} placeholder="000000" />
    </div>
  );
}

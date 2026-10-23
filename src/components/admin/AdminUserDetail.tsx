'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useStaff } from '@/components/admin/AdminShell';
import { ACTION_LABEL, AdminHead, PROVIDER, StatusPill, USER_STATUS, promptReason } from '@/components/admin/ui';
import { api, fmtDate, formatPhone } from '@/lib/api';
import { won } from '@/lib/format';

interface Detail {
  id: number; name: string | null; phone: string | null; email: string | null; social_provider: string; status: string;
  is_admin: boolean; is_lawyer: boolean; created_at: string; last_login_at: string | null;
  terms_agreed_at: string | null; privacy_agreed_at: string | null; marketing_consent: boolean | null; marketing_consent_at: string | null;
  onboarded_at: string | null; suspended_at: string | null; withdrawn_at: string | null;
  cases: { id: number; case_no: string; service_name: string; status: string; status_label: string; total: number; created_at: string }[];
  logs: { id: number; action: string; actor_name: string | null; reason: string | null; created_at: string }[];
}

export default function AdminUserDetail({ id }: { id: number }) {
  const staff = useStaff();
  const [u, setU] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => api<Detail>(`/admin/users/${id}`).then(setU).catch((e) => setError((e as Error).message)), [id]);
  useEffect(() => { load(); }, [load]);

  async function act(path: string, body: unknown) {
    setError(null);
    try {
      await api(`/admin/users/${id}/${path}`, { method: 'POST', body: JSON.stringify(body) });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function setRole(role: 'is_admin' | 'is_lawyer', on: boolean) {
    const label = role === 'is_admin' ? '관리자' : '변호사';
    const reason = promptReason(`${u?.name}님의 ${label} 권한을 ${on ? '부여' : '해제'}합니다. 사유를 입력하세요.`);
    if (reason) act('roles', { [role]: on, reason });
  }

  if (!u) return error ? <p className="form-error">{error}</p> : <div className="spinner" />;
  const self = u.id === staff.id;

  return (
    <>
      <Link href="/admin/users" className="sub">← 회원 목록</Link>
      <AdminHead title={u.name ?? '(가입 미완료)'} sub={`회원 #${u.id} · ${PROVIDER[u.social_provider] ?? u.social_provider} 로그인`}>
        <span className={`status-pill u-${u.status}`}>{USER_STATUS[u.status]}</span>
      </AdminHead>
      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="admin-grid">
        <div className="admin-col">
          <section className="admin-card">
            <h2>기본 정보</h2>
            <dl className="profile" style={{ gridTemplateColumns: '110px 1fr' }}>
              <dt>연락처</dt><dd>{formatPhone(u.phone) || '—'}</dd>
              <dt>이메일</dt><dd>{u.email ?? '—'}</dd>
              <dt>가입</dt><dd>{fmtDate(u.created_at, true)}</dd>
              <dt>가입 완료</dt><dd>{fmtDate(u.onboarded_at, true)}</dd>
              <dt>최근 로그인</dt><dd>{fmtDate(u.last_login_at, true)}</dd>
            </dl>
          </section>
          <section className="admin-card">
            <h2>동의 기록</h2>
            <dl className="profile" style={{ gridTemplateColumns: '130px 1fr' }}>
              <dt>이용약관</dt><dd>{fmtDate(u.terms_agreed_at, true)}</dd>
              <dt>개인정보 수집·이용</dt><dd>{fmtDate(u.privacy_agreed_at, true)}</dd>
              <dt>마케팅 수신</dt><dd>{u.marketing_consent === null ? '미응답' : u.marketing_consent ? '동의' : '거부'} · {fmtDate(u.marketing_consent_at, true)}</dd>
            </dl>
          </section>
          <section className="admin-card">
            <h2>사건 ({u.cases.length})</h2>
            {u.cases.length === 0 ? <p className="sub">없음</p> : (
              <table className="table admin-table">
                <tbody>
                  {u.cases.map((c) => (
                    <tr key={c.id}>
                      <td><Link href={`/admin/cases/${c.id}`}>{c.case_no}</Link></td><td>{c.service_name}</td>
                      <td><StatusPill status={c.status} label={c.status_label} /></td><td className="num">{c.total ? won(c.total) : '견적'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>

        <div className="admin-col">
          {u.status !== 'withdrawn' && (
            <section className="admin-card">
              <h2>조치</h2>
              <div className="role-row">
                <span>관리자</span>
                <button className="btn btn-ghost" disabled={self && u.is_admin} onClick={() => setRole('is_admin', !u.is_admin)}>{u.is_admin ? '해제' : '부여'}</button>
              </div>
              <div className="role-row">
                <span>변호사 (수임 확정·검수 권한)</span>
                <button className="btn btn-ghost" onClick={() => setRole('is_lawyer', !u.is_lawyer)}>{u.is_lawyer ? '해제' : '부여'}</button>
              </div>
              <div className="role-row">
                <span>{u.status === 'suspended' ? `이용 정지 중 (${fmtDate(u.suspended_at)})` : '이용 정지'}</span>
                {u.status === 'suspended'
                  ? <button className="btn btn-ghost" onClick={() => { const r = promptReason('정지 해제 사유'); if (r) act('unsuspend', { reason: r }); }}>해제</button>
                  : <button className="btn btn-ghost danger" disabled={self} onClick={() => { const r = promptReason('이용 정지 사유 — 로그인 중인 세션도 즉시 끊깁니다'); if (r) act('suspend', { reason: r }); }}>정지</button>}
              </div>
              {self && <p className="sub" style={{ marginTop: 8 }}>본인의 관리자 권한 해제·정지는 다른 관리자가 해야 합니다.</p>}
            </section>
          )}
          <section className="admin-card">
            <h2>이 회원에 대한 기록</h2>
            <ol className="log-list">
              {u.logs.map((l) => (
                <li key={l.id}>
                  <b>{ACTION_LABEL[l.action] ?? l.action}</b> <span className="sub">{l.actor_name ?? '시스템'} · {fmtDate(l.created_at, true)}</span>
                  {l.reason && <p>{l.reason}</p>}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </>
  );
}

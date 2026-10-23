'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { api, fmtDate, formatPhone, type CaseDetail, type User } from '@/lib/api';
import { won } from '@/lib/format';

const PROVIDER_LABEL = { kakao: '카카오', naver: '네이버', dev: '개발용' } as const;

export default function MyAccount() {
  const router = useRouter();
  const { user, ready, setUser, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [cases, setCases] = useState<CaseDetail[] | null>(null);
  // 로그아웃·탈퇴로 user 가 비는 순간 아래 "비로그인이면 /login 으로" 가 먼저 돌아 홈 대신 로그인 화면으로 가는 것을 막는다
  const leaving = useRef(false);

  useEffect(() => {
    if (!ready || leaving.current) return;
    if (!user) router.replace('/login?next=/my');
    else if (!user.is_onboarded) router.replace('/signup?next=/my');
  }, [ready, user, router]);

  useEffect(() => {
    if (ready && user?.is_onboarded) api<CaseDetail[]>('/cases').then(setCases).catch(() => setCases([]));
  }, [ready, user]);

  if (!ready || !user || !user.is_onboarded) {
    return <div className="container auth-wrap"><div className="spinner" /></div>;
  }

  async function toggleMarketing() {
    setBusy(true);
    try {
      setUser(await api<User>('/auth/me', { method: 'PATCH', body: JSON.stringify({ marketing_consent: !user!.marketing_consent }) }));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    leaving.current = true;
    await logout();
    router.replace('/');
  }

  async function withdraw() {
    if (!confirm('회원 탈퇴하시겠습니까? 회원 정보가 삭제되며 되돌릴 수 없습니다.')) return;
    try {
      leaving.current = true;
      await api('/auth/me', { method: 'DELETE' });
    } catch (e) {
      leaving.current = false;
      alert((e as Error).message);  // 진행 중 사건이 있으면 서버가 막는다
      return;
    }
    setUser(null);
    router.replace('/');
  }

  return (
    <div className="container section">
      <span className="eyebrow">My cases</span>
      <h1 style={{ fontSize: 'clamp(1.7rem, 3.6vw, 2.4rem)' }}>{user.name}님의 사건</h1>

      <div className="detail" style={{ marginTop: 32 }}>
        <div>
          {cases === null ? (
            <div className="spinner" />
          ) : cases.length === 0 ? (
            <div className="card empty-cases">
              <h3>접수한 사건이 없습니다</h3>
              <p>필요한 서비스의 정찰가와 다음 단계 비용을 확인하고 온라인 문진으로 접수해 보세요.</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
                <Link href="/journeys" className="btn btn-primary">여정 상품 보기</Link>
                <Link href="/services" className="btn btn-ghost">전체 가격표</Link>
              </div>
            </div>
          ) : (
            <div className="grid" style={{ gap: 14 }}>
              {cases.map((c) => (
                <Link key={c.id} href={`/my/cases/${c.id}`} className="card case-card">
                  <div className="case-card-top">
                    <span className={`status-pill s-${c.status}`}>{c.status_label}</span>
                    <span className="sub">{c.case_no}</span>
                  </div>
                  <h3>{c.service_name}</h3>
                  <p>{c.opponent_name ? `상대방 ${c.opponent_name} · ` : ''}접수 {fmtDate(c.created_at)}{c.due_at && !['delivered', 'rejected'].includes(c.status) ? ` · 납기 ${fmtDate(c.due_at)}` : ''}</p>
                  <span className="price price-sm" style={{ marginTop: 8 }}>{c.total ? won(c.total) : '개별 견적'}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside className="card">
          <h3>내 정보</h3>
          <dl className="profile">
            <dt>이름</dt><dd>{user.name}</dd>
            <dt>휴대폰</dt><dd>{formatPhone(user.phone)}</dd>
            <dt>로그인</dt><dd>{PROVIDER_LABEL[user.social_provider]}{user.email ? ` · ${user.email}` : ''}</dd>
          </dl>
          <label className="consent" style={{ marginTop: 14 }}>
            <input type="checkbox" checked={!!user.marketing_consent} disabled={busy} onChange={toggleMarketing} />
            <span>서비스 소식·혜택 안내 받기</span>
          </label>
          <div style={{ display: 'grid', gap: 8, marginTop: 20 }}>
            <button className="btn btn-ghost" onClick={signOut}>로그아웃</button>
            <button className="link-btn" onClick={withdraw}>회원 탈퇴</button>
          </div>
        </aside>
      </div>
    </div>
  );
}

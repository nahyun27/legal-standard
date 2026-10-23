'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminHead, PROVIDER, Pager, USER_STATUS } from '@/components/admin/ui';
import { api, fmtDate } from '@/lib/api';

interface Row {
  id: number; name: string | null; phone: string | null; email: string | null; social_provider: string; status: string;
  is_admin: boolean; is_lawyer: boolean; created_at: string; last_login_at: string | null;
}

const FILTERS = [['', '전체'], ['active', '정상'], ['pending', '가입 미완료'], ['suspended', '이용 정지'], ['withdrawn', '탈퇴']] as const;

export default function AdminUsers() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [staffOnly, setStaffOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: Row[]; total: number; pages: number } | null>(null);

  useEffect(() => {
    const p = new URLSearchParams({ page: String(page) });
    if (q.trim()) p.set('q', q.trim());
    if (status) p.set('status', status);
    if (staffOnly) p.set('role', 'staff');
    const t = setTimeout(() => api<typeof data>(`/admin/users?${p}`).then(setData), q ? 250 : 0);
    return () => clearTimeout(t);
  }, [q, status, staffOnly, page]);

  return (
    <>
      <AdminHead title="회원" sub="연락처는 가려서 보여줍니다. 회원 상세를 열면 전체 정보가 보이며, 열람 기록이 남습니다." />
      <div className="tabs">
        {FILTERS.map(([v, l]) => <button key={v} className={status === v ? 'on' : ''} onClick={() => { setStatus(v); setPage(1); }}>{l}</button>)}
      </div>
      <div className="filters">
        <input placeholder="이름·이메일·연락처·회원번호 검색" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <label className="consent" style={{ flex: 'none', padding: 0 }}>
          <input type="checkbox" checked={staffOnly} onChange={(e) => { setStaffOnly(e.target.checked); setPage(1); }} /> 직원만
        </label>
        <span className="sub">{data ? `${data.total}명` : ''}</span>
      </div>
      <div className="admin-card" style={{ padding: 0 }}>
        <table className="table admin-table">
          <thead><tr><th>#</th><th>이름</th><th>연락처</th><th>로그인</th><th>상태</th><th>권한</th><th>가입</th><th>최근 로그인</th></tr></thead>
          <tbody>
            {!data ? <tr><td colSpan={8}><div className="spinner" /></td></tr>
              : data.items.length === 0 ? <tr><td colSpan={8} className="empty">해당하는 회원이 없습니다.</td></tr>
              : data.items.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td><Link href={`/admin/users/${u.id}`}>{u.name ?? '(가입 미완료)'}</Link></td>
                  <td>{u.phone ?? '—'}</td>
                  <td>{PROVIDER[u.social_provider] ?? u.social_provider}</td>
                  <td><span className={`status-pill u-${u.status}`}>{USER_STATUS[u.status]}</span></td>
                  <td>{[u.is_admin && '관리자', u.is_lawyer && '변호사'].filter(Boolean).join(', ') || '—'}</td>
                  <td>{fmtDate(u.created_at)}</td>
                  <td>{fmtDate(u.last_login_at, true)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {data && <Pager page={page} pages={data.pages} onPage={setPage} />}
    </>
  );
}

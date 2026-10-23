'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useStaff } from '@/components/admin/AdminShell';
import { AdminHead, Pager, StatusPill } from '@/components/admin/ui';
import { api, fmtDate } from '@/lib/api';
import { won } from '@/lib/format';

interface Row {
  id: number; case_no: string; service_name: string; status: string; status_label: string; client_name: string | null;
  opponent_name: string | null; total: number; lawyer_name: string | null; paid_at: string | null; due_at: string | null; overdue: boolean;
}

const TABS = [
  ['open', '진행 중'], ['reviewing', '수임 검토'], ['in_progress', '서면 준비'], ['lawyer_review', '검수 대기'],
  ['approved', '발송 준비'], ['delivered', '완료'], ['rejected', '불성립'], ['pending_payment', '결제 대기'], ['', '전체'],
] as const;

export default function AdminCases({ initialStatus }: { initialStatus: string }) {
  const staff = useStaff();
  const [status, setStatus] = useState(initialStatus);
  const [q, setQ] = useState('');
  const [mine, setMine] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: Row[]; total: number; pages: number } | null>(null);

  useEffect(() => {
    const p = new URLSearchParams({ page: String(page) });
    if (status) p.set('status', status);
    if (q.trim()) p.set('q', q.trim());
    if (mine) p.set('mine', 'true');
    const t = setTimeout(() => api<typeof data>(`/admin/cases?${p}`).then(setData), q ? 250 : 0);
    return () => clearTimeout(t);
  }, [status, q, mine, page]);

  return (
    <>
      <AdminHead title="사건" sub="마감이 급한 순서로 보여줍니다." />
      <div className="tabs">
        {TABS.map(([v, l]) => (
          <button key={v} className={status === v ? 'on' : ''} onClick={() => { setStatus(v); setPage(1); }}>{l}</button>
        ))}
      </div>
      <div className="filters">
        <input placeholder="사건번호·상대방·상품 검색" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        {staff.is_lawyer && (
          <label className="consent" style={{ flex: 'none', padding: 0 }}>
            <input type="checkbox" checked={mine} onChange={(e) => { setMine(e.target.checked); setPage(1); }} /> 내 담당만
          </label>
        )}
        <span className="sub">{data ? `${data.total}건` : ''}</span>
      </div>
      <div className="admin-card" style={{ padding: 0 }}>
        <table className="table admin-table">
          <thead><tr><th>사건번호</th><th>상품</th><th>의뢰인</th><th>상대방</th><th>상태</th><th>담당</th><th>결제</th><th>납기</th><th className="num">금액</th></tr></thead>
          <tbody>
            {!data ? <tr><td colSpan={9}><div className="spinner" /></td></tr>
              : data.items.length === 0 ? <tr><td colSpan={9} className="empty">해당하는 사건이 없습니다.</td></tr>
              : data.items.map((c) => (
                <tr key={c.id} className="clickable" onClick={() => (window.location.href = `/admin/cases/${c.id}`)}>
                  <td><Link href={`/admin/cases/${c.id}`} onClick={(e) => e.stopPropagation()}>{c.case_no}</Link></td>
                  <td>{c.service_name}</td>
                  <td>{c.client_name}</td>
                  <td>{c.opponent_name ?? '—'}</td>
                  <td><StatusPill status={c.status} label={c.status_label} /></td>
                  <td>{c.lawyer_name ?? '—'}</td>
                  <td>{fmtDate(c.paid_at)}</td>
                  <td className={c.overdue ? 'overdue' : ''}>{fmtDate(c.due_at)}{c.overdue && ' 초과'}</td>
                  <td className="num">{c.total ? won(c.total) : '견적'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {data && <Pager page={page} pages={data.pages} onPage={setPage} />}
    </>
  );
}

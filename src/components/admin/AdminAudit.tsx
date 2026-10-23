'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ACTION_LABEL, AdminHead, Pager } from '@/components/admin/ui';
import { api, fmtDate } from '@/lib/api';

interface Row {
  id: number; action: string; actor_id: number | null; actor_name: string | null; target_type: string | null; target_id: number | null;
  reason: string | null; detail: Record<string, unknown> | null; ip: string | null; created_at: string;
}

const FILTERS = [['', '전체'], ['user.', '회원 관련'], ['case.', '사건'], ['payment.', '결제'], ['file.', '파일'], ['user.view', '개인정보 열람']] as const;

export default function AdminAudit() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: Row[]; total: number; pages: number } | null>(null);

  useEffect(() => {
    const p = new URLSearchParams({ page: String(page) });
    if (action) p.set('action', action);
    api<typeof data>(`/admin/audit-logs?${p}`).then(setData);
  }, [action, page]);

  return (
    <>
      <AdminHead title="감사 로그" sub="관리자 조치·개인정보 열람·결제·파일 접근 기록. 수정·삭제할 수 없습니다." />
      <div className="tabs">
        {FILTERS.map(([v, l]) => <button key={v} className={action === v ? 'on' : ''} onClick={() => { setAction(v); setPage(1); }}>{l}</button>)}
      </div>
      <div className="admin-card" style={{ padding: 0 }}>
        <table className="table admin-table">
          <thead><tr><th>시각</th><th>행위자</th><th>조치</th><th>대상</th><th>사유·내용</th><th>IP</th></tr></thead>
          <tbody>
            {!data ? <tr><td colSpan={6}><div className="spinner" /></td></tr>
              : data.items.length === 0 ? <tr><td colSpan={6} className="empty">기록이 없습니다.</td></tr>
              : data.items.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.created_at, true)}</td>
                  <td>{r.actor_id ? <Link href={`/admin/users/${r.actor_id}`}>{r.actor_name ?? `#${r.actor_id}`}</Link> : '시스템'}</td>
                  <td>{ACTION_LABEL[r.action] ?? r.action}</td>
                  <td>{r.target_type === 'case' ? <Link href={`/admin/cases/${r.target_id}`}>사건 #{r.target_id}</Link>
                    : r.target_type === 'user' ? <Link href={`/admin/users/${r.target_id}`}>회원 #{r.target_id}</Link> : '—'}</td>
                  <td className="log-reason">{r.reason ?? (r.detail ? JSON.stringify(r.detail) : '')}</td>
                  <td className="sub">{r.ip ?? ''}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {data && <Pager page={page} pages={data.pages} onPage={setPage} />}
    </>
  );
}

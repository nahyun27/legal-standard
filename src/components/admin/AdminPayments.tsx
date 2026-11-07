'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminHead, Pager } from '@/components/admin/ui';
import { api, fmtDate } from '@/lib/api';
import { won } from '@/lib/format';

interface Row {
  id: number; order_id: string; amount: number; status: string; status_label: string; method: string | null; simulated: boolean;
  receipt_url: string | null; created_at: string; approved_at: string | null; canceled_at: string | null; cancel_reason: string | null;
  kind: 'case' | 'charge'; charge_label: string | null; case_id: number; case_no: string; service_name: string; client_name: string | null;
}
interface Data { items: Row[]; total: number; pages: number; summary: Record<string, { count: number; amount: number }> }

const STATUS = [['', '전체'], ['done', '결제 완료'], ['canceled', '환불·취소'], ['failed', '실패'], ['ready', '결제 대기']] as const;
const KIND = [['', '전체'], ['case', '사건 결제'], ['charge', '추가 요금']] as const;
const RANGE = [['', '전체 기간'], ['7', '7일'], ['30', '30일'], ['90', '90일']] as const;
const PILL: Record<string, string> = { done: 'delivered', canceled: 'rejected', failed: 'rejected', ready: 'pending_payment' };

/** 주문·결제 — 사건 본 결제와 추가 요금 결제를 한 줄씩. 결제창만 열고 끝난 대기 건은 "결제 대기"를 골라야 보인다. */
export default function AdminPayments() {
  const [status, setStatus] = useState('');
  const [kind, setKind] = useState('');
  const [days, setDays] = useState('30');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    const p = new URLSearchParams({ page: String(page) });
    if (status) p.set('status', status);
    if (kind) p.set('kind', kind);
    if (days) p.set('days', days);
    if (q.trim()) p.set('q', q.trim());
    const t = setTimeout(() => api<Data>(`/admin/payments?${p}`).then(setData), q ? 250 : 0);
    return () => clearTimeout(t);
  }, [status, kind, days, q, page]);

  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };
  const done = data?.summary.done, canceled = data?.summary.canceled;

  return (
    <>
      <AdminHead title="주문·결제" sub="사건 결제와 추가 요금 결제를 한곳에서 봅니다. 금액은 VAT·실비 포함입니다." />
      <div className="tabs">
        {STATUS.map(([v, l]) => <button key={v} className={status === v ? 'on' : ''} onClick={() => reset(setStatus)(v)}>{l}</button>)}
      </div>
      <div className="filters">
        <select value={days} onChange={(e) => reset(setDays)(e.target.value)} aria-label="기간">
          {RANGE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={kind} onChange={(e) => reset(setKind)(e.target.value)} aria-label="결제 종류">
          {KIND.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input placeholder="주문번호·사건번호·상품·상대방 검색" value={q} onChange={(e) => reset(setQ)(e.target.value)} />
        <span className="sub">{data ? `${data.total}건` : ''}</span>
      </div>

      <div className="kpis">
        <div className="kpi"><small>결제 완료</small><b>{won(done?.amount ?? 0)}</b><span>{done?.count ?? 0}건</span></div>
        <div className="kpi"><small>환불·취소</small><b>{won(canceled?.amount ?? 0)}</b><span>{canceled?.count ?? 0}건</span></div>
        <div className="kpi"><small>결제 건당 평균</small><b>{done?.count ? won(Math.round(done.amount / done.count)) : '—'}</b><span>환불된 결제는 결제 완료에서 빠짐</span></div>
        <div className="kpi"><small>실패</small><b>{data?.summary.failed?.count ?? 0}</b><span>건</span></div>
      </div>

      <div className="admin-card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="table admin-table">
          <thead><tr><th>결제일</th><th>주문번호</th><th>사건</th><th>상품 · 내역</th><th>의뢰인</th><th>상태</th><th>수단</th><th className="num">금액</th><th>영수증</th></tr></thead>
          <tbody>
            {!data ? <tr><td colSpan={9}><div className="spinner" /></td></tr>
              : data.items.length === 0 ? <tr><td colSpan={9} className="empty">해당하는 결제가 없습니다.</td></tr>
              : data.items.map((p) => (
                <tr key={p.id}>
                  <td>{fmtDate(p.approved_at ?? p.created_at)}</td>
                  <td><code className="mono">{p.order_id}</code></td>
                  <td><Link href={`/admin/cases/${p.case_id}`}>{p.case_no}</Link></td>
                  <td style={{ whiteSpace: 'normal', minWidth: 220 }}>
                    {p.service_name}
                    {p.kind === 'charge' && <div className="sub">추가 요금 · {p.charge_label}</div>}
                    {p.status === 'canceled' && p.cancel_reason && <div className="sub">환불 사유: {p.cancel_reason}</div>}
                  </td>
                  <td>{p.client_name ?? '—'}</td>
                  <td>
                    <span className={`status-pill s-${PILL[p.status] ?? p.status}`}>{p.status_label}</span>
                    {p.canceled_at && <div className="sub">{fmtDate(p.canceled_at)}</div>}
                  </td>
                  <td>{p.simulated ? '시뮬레이션' : p.method ?? '—'}</td>
                  <td className="num">{won(p.amount)}</td>
                  <td>{p.receipt_url ? <a href={p.receipt_url} target="_blank" rel="noreferrer">보기</a> : '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {data && <Pager page={page} pages={data.pages} onPage={setPage} />}
    </>
  );
}

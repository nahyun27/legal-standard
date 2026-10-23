'use client';

import Link from 'next/link';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Download, FileText, Paperclip, ShieldCheck } from 'lucide-react';
import { useStaff } from '@/components/admin/AdminShell';
import { ACTION_LABEL, AdminHead, StatusPill, promptReason } from '@/components/admin/ui';
import { api, fileUrl, fmtDate, fmtSize, upload, type CostLine } from '@/lib/api';
import { won } from '@/lib/format';

interface Detail {
  id: number; case_no: string; service_name: string; status: string; status_label: string;
  client_name: string | null; opponent_name: string | null; total: number; fee: number; vat: number; costs: CostLine[];
  claim_amount: number | null; intake: { client_name?: string; phone?: string; facts?: string; answers?: Record<string, string> };
  client: { id: number; name: string; phone: string; email: string | null } | null; source: string | null;
  lawyer_id: number | null; lawyer_name: string | null; reviewer_name: string | null; approved_file_id: number | null;
  checklist: string[]; review_checklist: string[] | null; reject_reason: string | null; delivery_note: string | null;
  created_at: string; paid_at: string | null; accepted_at: string | null; submitted_at: string | null; approved_at: string | null;
  delivered_at: string | null; due_at: string | null; overdue: boolean;
  files: { id: number; kind: string; filename: string; size: number; created_at: string; sha256: string }[];
  payments: { id: number; order_id: string; amount: number; status: string; method: string | null; simulated: boolean; approved_at: string | null; canceled_at: string | null }[];
  conflicts: { kind: string; case_id?: number; case_no?: string; user_id?: number; name: string }[];
  logs: { id: number; action: string; actor_name: string | null; reason: string | null; detail: Record<string, unknown> | null; created_at: string }[];
}

const PAY_STATUS: Record<string, string> = { ready: '결제 시도', done: '결제 완료', canceled: '환불', failed: '실패' };

export default function AdminCaseDetail({ id }: { id: number }) {
  const staff = useStaff();
  const [c, setC] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lawyers, setLawyers] = useState<{ id: number; name: string; open_cases: number }[]>([]);
  const [lawyerId, setLawyerId] = useState<number | ''>('');
  const [conflictOk, setConflictOk] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [memo, setMemo] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(() => api<Detail>(`/admin/cases/${id}`).then((d) => { setC(d); setChecked([]); }).catch((e) => setError((e as Error).message)), [id]);
  useEffect(() => { load(); api<typeof lawyers>('/admin/lawyers').then(setLawyers); }, [load]);
  useEffect(() => { if (staff.is_lawyer && lawyerId === '') setLawyerId(staff.id); }, [staff, lawyerId]);

  async function act(path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      await api(`/admin/cases/${id}/${path}`, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadDoc(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const f of Array.from(list)) await upload(`/admin/cases/${id}/files`, f, { kind: 'document' });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  if (!c) return error ? <p className="form-error">{error}</p> : <div className="spinner" />;

  const docs = c.files.filter((f) => f.kind === 'document');
  const evidence = c.files.filter((f) => f.kind === 'evidence');
  const latestDoc = docs[docs.length - 1];
  const lawyerOnly = !staff.is_lawyer && <p className="sub">이 단계는 변호사만 처리할 수 있습니다.</p>;

  return (
    <>
      <Link href="/admin/cases" className="sub">← 사건 목록</Link>
      <AdminHead title={`${c.case_no} · ${c.service_name}`} sub={`접수 ${fmtDate(c.created_at, true)}${c.source ? ` · 유입 ${c.source}` : ''}`}>
        <StatusPill status={c.status} label={c.status_label} />
      </AdminHead>
      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="admin-grid">
        <div className="admin-col">
          {/* ── 지금 할 일 ── */}
          <section className="admin-card action-card">
            <h2>지금 할 일</h2>

            {c.status === 'pending_payment' && <p className="sub">고객 결제를 기다리고 있습니다.</p>}

            {c.status === 'reviewing' && (
              <>
                {c.conflicts.length > 0 ? (
                  <div className="banner banner-warn" style={{ display: 'block' }}>
                    <b><AlertTriangle size={16} style={{ verticalAlign: -3 }} /> 이해충돌 후보 {c.conflicts.length}건</b> — 동명이인일 수 있으니 직접 확인하세요.
                    <ul style={{ margin: '8px 0 0 18px' }}>
                      {c.conflicts.map((x, i) => (
                        <li key={i}>{x.kind}: {x.name} {x.case_id ? <Link href={`/admin/cases/${x.case_id}`}>({x.case_no})</Link> : x.user_id ? <Link href={`/admin/users/${x.user_id}`}>(회원 #{x.user_id})</Link> : null}</li>
                      ))}
                    </ul>
                  </div>
                ) : <p className="sub" style={{ marginBottom: 12 }}><ShieldCheck size={15} style={{ verticalAlign: -3 }} /> 자동 대조에서 이해충돌 후보가 없습니다. (법인 기존 사건 목록과의 대조는 별도로 확인하세요)</p>}
                {staff.is_lawyer ? (
                  <>
                    <div className="field">
                      <label>담당 변호사</label>
                      <select value={lawyerId} onChange={(e) => setLawyerId(Number(e.target.value))}>
                        {lawyers.map((l) => <option key={l.id} value={l.id}>{l.name} (진행 {l.open_cases}건)</option>)}
                      </select>
                    </div>
                    <label className="consent"><input type="checkbox" checked={conflictOk} onChange={(e) => setConflictOk(e.target.checked)} /> 이해충돌이 없음을 확인했습니다</label>
                    <div className="action-row">
                      <button className="btn btn-primary" disabled={busy || !conflictOk || !lawyerId} onClick={() => act('accept', { lawyer_id: lawyerId, conflict_checked: true })}>수임 확정</button>
                      <button className="btn btn-ghost" disabled={busy} onClick={() => { const r = promptReason('수임 불성립 사유 (고객에게 보입니다). 결제금액은 전액 환불됩니다.'); if (r) act('reject', { reason: r }); }}>수임 불성립·환불</button>
                    </div>
                  </>
                ) : lawyerOnly}
              </>
            )}

            {c.status === 'in_progress' && (
              <>
                <p className="sub" style={{ marginBottom: 12 }}>서면을 올리고 변호사 검수를 요청하세요. 검수가 끝난 뒤에는 서면을 바꿀 수 없습니다.</p>
                <input ref={fileInput} type="file" hidden onChange={(e) => uploadDoc(e.target.files)} />
                <div className="action-row">
                  <button className="btn btn-ghost" disabled={busy} onClick={() => fileInput.current?.click()}><Paperclip size={15} /> 서면 올리기</button>
                  <button className="btn btn-primary" disabled={busy || docs.length === 0} onClick={() => act('submit-review')}>검수 요청</button>
                </div>
              </>
            )}

            {c.status === 'lawyer_review' && (
              <>
                {latestDoc && (
                  <a href={fileUrl(latestDoc.id)} className="file-row" style={{ marginBottom: 12 }}>
                    <FileText size={17} /><span>검수 대상: {latestDoc.filename}</span><small>{fmtDate(latestDoc.created_at, true)}</small><Download size={15} />
                  </a>
                )}
                {staff.is_lawyer ? (
                  <>
                    <div className="checklist">
                      {c.checklist.map((item) => (
                        <label key={item} className="consent">
                          <input type="checkbox" checked={checked.includes(item)} onChange={(e) => setChecked(e.target.checked ? [...checked, item] : checked.filter((x) => x !== item))} />
                          {item}
                        </label>
                      ))}
                    </div>
                    <div className="action-row">
                      <button className="btn btn-primary" disabled={busy || checked.length < c.checklist.length} onClick={() => act('approve', { checklist: checked })}>
                        검수 완료 ({checked.length}/{c.checklist.length})
                      </button>
                      <button className="btn btn-ghost" disabled={busy} onClick={() => { const r = promptReason('반려 사유 (예: 요건사실 누락 — 지연손해금 기산일)'); if (r) act('send-back', { reason: r }); }}>반려</button>
                    </div>
                  </>
                ) : lawyerOnly}
              </>
            )}

            {c.status === 'approved' && (
              <>
                <p className="sub" style={{ marginBottom: 10 }}>검수 완료: {c.reviewer_name} 변호사 · {fmtDate(c.approved_at, true)}</p>
                <div className="field">
                  <label>발송·제출 내역</label>
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 내용증명 등기번호 1234-5678-9012 / 전자소송 접수번호" />
                  <span className="hint">고객에게 그대로 보입니다.</span>
                </div>
                <button className="btn btn-primary" disabled={busy || note.trim().length < 2} onClick={() => act('deliver', { note })}>발송·제출 완료</button>
              </>
            )}

            {c.status === 'delivered' && <p>완료 {fmtDate(c.delivered_at, true)} · {c.delivery_note}</p>}
            {c.status === 'rejected' && <p>수임 불성립: {c.reject_reason}</p>}
          </section>

          <section className="admin-card">
            <h2>문진</h2>
            <dl className="profile" style={{ gridTemplateColumns: '90px 1fr' }}>
              <dt>의뢰인</dt><dd>{c.intake.client_name} · {c.intake.phone}{c.client && <> (<Link href={`/admin/users/${c.client.id}`}>회원 #{c.client.id}</Link>)</>}</dd>
              <dt>상대방</dt><dd>{c.opponent_name ?? '—'}</dd>
              {c.claim_amount !== null && <><dt>청구 금액</dt><dd>{won(c.claim_amount)}</dd></>}
              <dt>사실관계</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{c.intake.facts || '—'}</dd>
              {Object.entries(c.intake.answers ?? {}).map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}
            </dl>
          </section>

          <section className="admin-card">
            <h2>파일</h2>
            <h3 className="sub-h">서면 ({docs.length})</h3>
            {docs.length === 0 ? <p className="sub">아직 없음</p> : docs.map((f) => (
              <a key={f.id} href={fileUrl(f.id)} className="file-row">
                <FileText size={16} /><span>{f.filename}{f.id === c.approved_file_id && <em className="approved"> 검수 승인본</em>}</span>
                <small title={`SHA-256 ${f.sha256}`}>{fmtSize(f.size)} · {fmtDate(f.created_at, true)}</small>
              </a>
            ))}
            <h3 className="sub-h">의뢰인 자료 ({evidence.length})</h3>
            {evidence.length === 0 ? <p className="sub">아직 없음</p> : evidence.map((f) => (
              <a key={f.id} href={fileUrl(f.id)} className="file-row">
                <Paperclip size={16} /><span>{f.filename}</span><small>{fmtSize(f.size)} · {fmtDate(f.created_at, true)}</small>
              </a>
            ))}
          </section>
        </div>

        <div className="admin-col">
          <section className="admin-card">
            <h2>요약</h2>
            <dl className="profile" style={{ gridTemplateColumns: '80px 1fr' }}>
              <dt>담당</dt><dd>{c.lawyer_name ?? '—'}</dd>
              <dt>납기</dt><dd className={c.overdue ? 'overdue' : ''}>{fmtDate(c.due_at)}{c.overdue && ' (초과)'}</dd>
              <dt>결제</dt><dd>{fmtDate(c.paid_at, true)}</dd>
              <dt>수임</dt><dd>{fmtDate(c.accepted_at, true)}</dd>
              <dt>검수 요청</dt><dd>{fmtDate(c.submitted_at, true)}</dd>
              <dt>검수 완료</dt><dd>{fmtDate(c.approved_at, true)}{c.reviewer_name ? ` · ${c.reviewer_name}` : ''}</dd>
            </dl>
          </section>

          <section className="admin-card">
            <h2>금액</h2>
            <table className="table compact">
              <tbody>
                <tr><td>수임료</td><td className="num">{won(c.fee)}</td></tr>
                <tr><td>부가세</td><td className="num">{won(c.vat)}</td></tr>
                {c.costs.map((x) => <tr key={x.label}><td>{x.label}</td><td className="num">{won(x.amount)}</td></tr>)}
                <tr className="total-row"><td>합계</td><td className="num">{won(c.total)}</td></tr>
              </tbody>
            </table>
            {c.payments.filter((p) => p.status !== 'ready').map((p) => (
              <p key={p.id} className="sub" style={{ marginTop: 8 }}>
                {PAY_STATUS[p.status]} {won(p.amount)} · {p.simulated ? '시뮬레이션 결제' : p.method ?? ''} · {fmtDate(p.canceled_at ?? p.approved_at, true)}
              </p>
            ))}
          </section>

          <section className="admin-card">
            <h2>처리 기록</h2>
            <form className="memo" onSubmit={async (e) => { e.preventDefault(); if (memo.trim()) { await act('notes', { text: memo }); setMemo(''); } }}>
              <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="내부 메모 (고객에게 보이지 않음)" />
              <button className="btn btn-ghost" disabled={busy || !memo.trim()}>남기기</button>
            </form>
            <ol className="log-list">
              {c.logs.filter((l) => l.action !== 'case.view').map((l) => (
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

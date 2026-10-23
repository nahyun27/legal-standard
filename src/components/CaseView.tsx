'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Download, FileText, Paperclip } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { getService, serviceTitle } from '@/data/services';
import { ApiError, api, fileUrl, fmtDate, fmtSize, upload, type CaseDetail, type CaseStatus } from '@/lib/api';
import { priceLabel, won } from '@/lib/format';
import { startPayment } from '@/lib/payment';

// 고객에게 보여주는 진행 단계. 내부 상태(검수 대기·발송 준비 등)는 고객 눈높이의 5단계로 묶는다.
const STAGES = ['접수·결제', '수임 검토', '서면 준비', '변호사 검토·서명', '발송·제출'];
const STAGE_OF: Record<CaseStatus, number> = {
  pending_payment: 0, reviewing: 1, in_progress: 2, lawyer_review: 3, approved: 3, delivered: 5, rejected: -1, canceled: -1,
};

export default function CaseView({ id, justPaid }: { id: number; justPaid: boolean }) {
  const router = useRouter();
  const { user, ready } = useAuth();
  const [c, setC] = useState<CaseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    api<CaseDetail>(`/cases/${id}`).then(setC).catch((e) => setError(e instanceof ApiError && e.status === 404 ? '사건을 찾을 수 없습니다.' : (e as Error).message));
  }, [id]);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent(`/my/cases/${id}`)}`);
    else load();
  }, [ready, user, id, load, router]);

  async function addFiles(list: FileList | null) {
    if (!list?.length) return;
    setError(null);
    try {
      for (const [i, f] of Array.from(list).entries()) {
        setBusy(`자료 올리는 중… (${i + 1}/${list.length})`);
        await upload(`/cases/${id}/files`, f);
      }
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function pay() {
    setError(null);
    setBusy('결제창을 여는 중…');
    try {
      const r = await startPayment(id);
      if (r !== 'redirected' && r !== 'canceled') setC(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    if (!confirm('이 접수를 취소할까요? 작성한 문진은 삭제되지 않지만 목록에서 사라집니다.')) return;
    await api(`/cases/${id}/cancel`, { method: 'POST' });
    router.replace('/my');
  }

  if (error && !c) {
    return (
      <div className="container auth-wrap">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <p className="form-error">{error}</p>
          <Link href="/my" className="btn btn-primary">내 사건으로</Link>
        </div>
      </div>
    );
  }
  if (!c) return <div className="container auth-wrap"><div className="spinner" /></div>;

  const stage = STAGE_OF[c.status];
  const service = getService(c.service_slug);
  const nexts = (service?.next ?? []).map((n) => ({ ...n, s: getService(n.slug)! }));
  const evidence = c.files.filter((f) => f.kind === 'evidence');
  const documents = c.files.filter((f) => f.kind === 'document');
  const canUpload = ['pending_payment', 'reviewing', 'in_progress'].includes(c.status);

  return (
    <div className="container section">
      <Link href="/my" className="sub">← 내 사건</Link>
      <div className="case-head">
        <div>
          <span className={`status-pill s-${c.status}`}>{c.status_label}</span>
          <h1 style={{ fontSize: 'clamp(1.6rem, 3.4vw, 2.2rem)', marginTop: 10 }}>{c.service_name}</h1>
          <p className="sub">{c.case_no} · 접수 {fmtDate(c.created_at)}{c.lawyer_name ? ` · 담당 ${c.lawyer_name} 변호사` : ''}</p>
        </div>
      </div>

      {justPaid && c.status === 'reviewing' && (
        <div className="banner banner-good"><CheckCircle2 size={18} /> 결제가 완료되었습니다. 담당 변호사가 24시간 안에 수임 여부를 검토하고 알려 드립니다.</div>
      )}
      {c.status === 'rejected' && (
        <div className="banner banner-warn">
          표준 서비스로 진행하기 어려워 결제금액 전액을 환불했습니다.{c.reject_reason && <><br /><b>사유</b> {c.reject_reason}</>}
        </div>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      {busy && <p className="sub" role="status">{busy}</p>}

      <div className="detail" style={{ marginTop: 24 }}>
        <div className="grid" style={{ gap: 22 }}>
          {stage >= 0 && (
            <div className="card">
              <h3>진행 상황</h3>
              <ol className="stepper">
                {STAGES.map((s, i) => (
                  <li key={s} className={i < stage ? 'done' : i === stage ? 'now' : ''}>
                    <span className="dot">{i < stage ? '✓' : i + 1}</span>{s}
                  </li>
                ))}
              </ol>
              {c.due_at && stage >= 2 && stage < 5 && <p className="sub" style={{ marginTop: 12 }}>표준 납기: {fmtDate(c.due_at)}까지</p>}
              {c.status === 'delivered' && c.delivery_note && <p className="notice" style={{ marginTop: 14 }}><b>발송·제출 내역</b> {c.delivery_note}</p>}
            </div>
          )}

          {c.status === 'delivered' && (
            <div className="card">
              <h3>완성된 서면</h3>
              <p style={{ marginBottom: 12 }}>담당 변호사가 검토·서명한 서면입니다.</p>
              {documents.map((f) => (
                <a key={f.id} href={fileUrl(f.id)} className="file-row">
                  <FileText size={18} /><span>{f.filename}</span><small>{fmtSize(f.size)}</small><Download size={16} />
                </a>
              ))}
            </div>
          )}

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <h3>제출한 자료 ({evidence.length})</h3>
              {canUpload && (
                <button className="btn btn-ghost" onClick={() => fileInput.current?.click()} disabled={!!busy}>
                  <Paperclip size={15} /> 자료 추가
                </button>
              )}
            </div>
            <input ref={fileInput} type="file" multiple hidden onChange={(e) => addFiles(e.target.files)} />
            {evidence.length === 0 ? (
              <p className="sub" style={{ marginTop: 8 }}>아직 올린 자료가 없습니다.</p>
            ) : evidence.map((f) => (
              <a key={f.id} href={fileUrl(f.id)} className="file-row">
                <Paperclip size={16} /><span>{f.filename}</span><small>{fmtSize(f.size)} · {fmtDate(f.created_at)}</small>
              </a>
            ))}
          </div>

          <div className="card">
            <h3>문진 내용</h3>
            <dl className="profile" style={{ gridTemplateColumns: '90px 1fr' }}>
              <dt>의뢰인</dt><dd>{c.intake.client_name}</dd>
              <dt>상대방</dt><dd>{c.opponent_name ?? '—'}</dd>
              {c.claim_amount !== null && <><dt>청구 금액</dt><dd>{won(c.claim_amount)}</dd></>}
              <dt>사실관계</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{c.intake.facts || '—'}</dd>
            </dl>
          </div>
        </div>

        <aside className="grid" style={{ gap: 18 }}>
          <div className="card">
            <h3>결제 내역</h3>
            {c.total === 0 ? <p>개별 견적 안내 예정</p> : (
              <table className="table compact">
                <tbody>
                  <tr><td>수임료</td><td className="num">{won(c.fee)}</td></tr>
                  <tr><td>부가세</td><td className="num">{won(c.vat)}</td></tr>
                  {c.costs.map((x) => <tr key={x.label}><td>{x.label}</td><td className="num">{won(x.amount)}</td></tr>)}
                  <tr className="total-row"><td><b>합계</b></td><td className="num">{won(c.total)}</td></tr>
                </tbody>
              </table>
            )}
            {c.status === 'pending_payment' && (
              <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
                <button className="btn btn-primary" onClick={pay} disabled={!!busy}>{won(c.total)} 결제하기</button>
                <button className="link-btn" onClick={cancel}>접수 취소</button>
              </div>
            )}
            {c.paid_at && <p className="sub" style={{ marginTop: 10 }}>결제 {fmtDate(c.paid_at, true)}</p>}
          </div>

          {nexts.length > 0 && c.status !== 'rejected' && (
            <div className="card">
              <h3>다음 단계와 가격</h3>
              <p className="sub" style={{ marginBottom: 10 }}>필요해지면 같은 정찰가로 이어서 신청할 수 있습니다.</p>
              {nexts.map((n) => (
                <Link key={n.slug} href={`/services/${n.slug}`} className="next-row">
                  <small>{n.when}</small>
                  <span><b>{serviceTitle(n.s)}</b><em>{priceLabel(n.s.price)}</em></span>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

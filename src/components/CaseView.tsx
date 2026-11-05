'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Download, FileSignature, FileText, Paperclip } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import PaymentConsent from '@/components/PaymentConsent';
import { PageHero } from '@/components/ui';
import { getService, serviceTitle } from '@/data/services';
import { ApiError, api, fileUrl, fmtDate, fmtSize, upload, type CaseDetail, type CaseStatus, type Charge, type RetainerDoc } from '@/lib/api';
import { priceText, won } from '@/lib/format';
import { startPayment, type Consents, type PayMethod } from '@/lib/payment';

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
  const [consents, setConsents] = useState<Consents>({ agree_engagement: false, agree_withdrawal: false });
  const [method, setMethod] = useState<PayMethod>('card');

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

  async function pay(chargeId?: number) {
    setError(null);
    setBusy('결제창을 여는 중…');
    try {
      const r = await startPayment(id, consents, method, chargeId);
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
    <>
    <PageHero crumbs={[{ label: '내 사건', href: '/my' }, { label: c.case_no }]} title={c.service_name}
      lead={`${c.case_no} · 접수 ${fmtDate(c.created_at)}${c.lawyer_name ? ` · 담당 ${c.lawyer_name} 변호사` : ''}`}>
      <div className="hero-badges"><span className={`status-pill s-${c.status}`}>{c.status_label}</span></div>
    </PageHero>
    <div className="container section" style={{ paddingTop: 28 }}>
      {justPaid && c.status === 'reviewing' && (
        <div className="banner banner-good"><CheckCircle2 size={18} /> 결제가 완료되었습니다. 담당 변호사가 24시간 안에 수임 여부를 검토하고 알려 드립니다.</div>
      )}
      {c.quote_note && c.status === 'pending_payment' && (
        <div className="banner banner-good" style={{ display: 'block' }}>
          <b>견적 안내</b>: {c.quote_note}<br />결제 금액 {won(c.total)} (부가세 포함). 결제하시면 담당 변호사가 수임 절차를 진행합니다.
        </div>
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

          {c.retainer && ['in_progress', 'lawyer_review', 'approved', 'delivered'].includes(c.status) && (
            <RetainerCard caseId={c.id} signedAt={c.retainer.signed_at} clientName={c.intake.client_name ?? ''} onSigned={setC} />
          )}

          {c.charges.length > 0 && (
            <ChargesCard charges={c.charges} busy={!!busy} consents={consents} onConsents={setConsents} method={method} onMethod={setMethod} onPay={pay} />
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
            {c.status === 'pending_payment' && c.total > 0 && (
              <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
                <PaymentConsent value={consents} onChange={setConsents} method={method} onMethod={setMethod} />
                <button className="btn btn-primary" onClick={() => pay()} disabled={!!busy || !consents.agree_engagement || !consents.agree_withdrawal}>{won(c.total)} 결제하기</button>
                <button className="link-btn" onClick={cancel}>접수 취소</button>
              </div>
            )}
            {c.paid_at && <p className="sub" style={{ marginTop: 10 }}>결제 {fmtDate(c.paid_at, true)}{c.refunded && ' · 전액 환불됨'}</p>}
            {c.receipt_url && <a href={c.receipt_url} target="_blank" rel="noreferrer" className="sub" style={{ textDecoration: 'underline' }}>결제 영수증 보기</a>}
          </div>

          {nexts.length > 0 && c.status !== 'rejected' && (
            <div className="card">
              <h3>다음 단계와 가격</h3>
              <p className="sub" style={{ marginBottom: 10 }}>필요해지면 같은 정찰가로 이어서 신청할 수 있습니다.</p>
              {nexts.map((n) => (
                // 접수 가능한 상품이면 이 사건 정보로 채운 문진으로 바로 — 아니면 상품 안내로
                <Link key={n.slug} href={n.s.stage === 'pilot' ? `/intake/${n.slug}?from=${c.id}${c.track ? `&track=${c.track}` : ''}` : `/services/${n.slug}`} className="next-row">
                  <small>{n.when}</small>
                  <span><b>{serviceTitle(n.s)}</b><em>{priceText(n.s, c.track ?? undefined)}</em></span>
                  <small className="next-cta">{n.s.stage === 'pilot' ? '이 사건 정보로 이어서 신청 →' : '오픈 예정 · 상품 안내 보기 →'}</small>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
    </>
  );
}

/**
 * 전자 수임약정 — 변호사 명의로 진행하는 사건은 수임 확정 뒤 여기서 약정 내용을 확인하고 서명한다.
 * 서명하면 문안 버전·본문 해시·시각이 사건에 남고, 그 전에는 변호사가 검수를 마칠 수 없다.
 */
function RetainerCard({ caseId, signedAt, clientName, onSigned }: {
  caseId: number; signedAt: string | null; clientName: string; onSigned: (c: CaseDetail) => void;
}) {
  const [doc, setDoc] = useState<RetainerDoc | null>(null);
  const [open, setOpen] = useState(!signedAt);
  const [name, setName] = useState('');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && !doc) api<RetainerDoc>(`/cases/${caseId}/retainer`).then(setDoc).catch((e) => setError((e as Error).message));
  }, [open, doc, caseId]);

  async function sign() {
    if (!doc) return;
    setBusy(true);
    setError(null);
    try {
      onSigned(await api<CaseDetail>(`/cases/${caseId}/retainer`, { method: 'POST', body: JSON.stringify({ name, agree, sha256: doc.sha256 }) }));
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
      setDoc(null); // 문안이 바뀌었으면(409) 새로 받는다
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`card retainer-card${signedAt ? '' : ' needs-sign'}`}>
      <h3><FileSignature size={18} /> 수임약정</h3>
      {signedAt ? (
        <p>{fmtDate(signedAt, true)}에 전자 서명했습니다. <button className="link-btn" onClick={() => setOpen(!open)}>{open ? '접기' : '약정서 보기'}</button></p>
      ) : (
        <p>변호사 명의로 진행하려면 수임약정에 서명해 주세요. 서명하신 뒤 담당 변호사가 서면을 확정하고 제출합니다.</p>
      )}
      {open && (
        !doc ? (error ? <p className="form-error">{error}</p> : <div className="spinner" style={{ margin: '16px auto' }} />) : (
          <>
            <pre className="retainer-text" tabIndex={0}>{doc.text}</pre>
            {!signedAt && (
              <div className="retainer-sign">
                <label className="consent"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> 위 수임약정 내용을 확인했고 이에 동의합니다.</label>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label htmlFor="rs">서명(의뢰인 성명 입력)</label>
                  <input id="rs" value={name} onChange={(e) => setName(e.target.value)} placeholder={clientName} autoComplete="name" />
                  <span className="hint">문진에 적은 의뢰인 성명과 같게 입력하면 전자 서명으로 기록됩니다.</span>
                </div>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="btn btn-primary" disabled={busy || !agree || name.trim().length < 2} onClick={sign}>수임약정 서명하기</button>
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}

/** 추가 요금(기일·조사 출석) — 담당 변호사가 정찰가로 청구하면 여기서 확인하고 결제한다. */
function ChargesCard({ charges, busy, consents, onConsents, method, onMethod, onPay }: {
  charges: Charge[]; busy: boolean; consents: Consents; onConsents: (c: Consents) => void;
  method: PayMethod; onMethod: (m: PayMethod) => void; onPay: (chargeId: number) => void;
}) {
  const pending = charges.filter((x) => x.status === 'pending');
  return (
    <div className="card">
      <h3>추가 요금</h3>
      <p className="sub" style={{ marginBottom: 10 }}>상품 페이지에 공개된 정찰가로만 청구합니다. 결제하신 뒤 해당 일정에 진행합니다.</p>
      <table className="table compact">
        <tbody>
          {charges.map((x) => (
            <tr key={x.id}>
              <td><b>{x.label}</b>{x.note && <span className="sub" style={{ display: 'block' }}>{x.note}</span>}</td>
              <td className="num">{won(x.total)}<span className="sub" style={{ display: 'block' }}>{x.status === 'paid' ? `결제 완료 ${x.paid_at ? fmtDate(x.paid_at) : ''}` : 'VAT 포함 · 결제 대기'}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      {pending.length > 0 && (
        <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
          <PaymentConsent value={consents} onChange={onConsents} method={method} onMethod={onMethod} />
          {pending.map((x) => (
            <button key={x.id} className="btn btn-primary" disabled={busy || !consents.agree_engagement || !consents.agree_withdrawal} onClick={() => onPay(x.id)}>
              {x.label} {won(x.total)} 결제하기
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

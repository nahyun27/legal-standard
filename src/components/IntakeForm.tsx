'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Paperclip, X } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import type { Service } from '@/data/types';
import { api, fmtSize, upload, type CaseDetail, type Quote } from '@/lib/api';
import { won } from '@/lib/format';
import { startPayment } from '@/lib/payment';

/**
 * 구조화 온라인 문진 → 사건 접수 → 증거 업로드 → 결제 (사업기획서 V "판매": 접수·결제·문진·수령 온라인 일원화).
 * 문진 작성은 로그인 없이 하고(이탈 방지), 결제 직전에 로그인·가입 마무리를 요구한다.
 * 입력은 sessionStorage 에 둬서 로그인하러 다녀와도 남는다 — 탭을 닫으면 지워진다(민감정보라 오래 남기지 않음).
 * 첨부 파일은 브라우저 보안상 저장할 수 없어 로그인 후 다시 골라야 한다.
 * 금액은 서버 견적(/catalog/quote)만 보여주고, 결제도 서버가 사건에 고정한 금액으로만 한다.
 */
const STEPS = ['당사자 정보', '사건 내용', '증거 자료', '총액 확인'] as const;

interface Draft {
  step: number;
  clientName: string;
  phone: string;
  opponent: string;
  amount: string;
  facts: string;
}

const EMPTY: Draft = { step: 0, clientName: '', phone: '', opponent: '', amount: '', facts: '' };
const digits = (s: string) => s.replace(/\D/g, '');

export default function IntakeForm({ service }: { service: Service }) {
  const key = `intake:${service.slug}`;
  const router = useRouter();
  const { user, ready } = useAuth();
  const [d, setD] = useState<Draft>(EMPTY);
  const [files, setFiles] = useState<File[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const isQuote = service.price.kind === 'quote';

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(key);
      if (saved) setD({ ...EMPTY, ...JSON.parse(saved) });
    } catch {}
    setLoaded(true);
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    try { sessionStorage.setItem(key, JSON.stringify(d)); } catch {}
  }, [d, key, loaded]);

  // 로그인돼 있으면 가입 때 받은 이름·연락처를 채워 준다(비어 있을 때만)
  useEffect(() => {
    if (loaded && user?.is_onboarded) {
      setD((p) => ({ ...p, clientName: p.clientName || user.name || '', phone: p.phone || user.phone || '' }));
    }
  }, [loaded, user]);

  // 총액 단계에 들어오면 서버 견적을 받는다
  useEffect(() => {
    if (d.step !== 3) return;
    const claim = digits(d.amount);
    api<Quote>(`/catalog/quote?service=${service.slug}${claim ? `&claim_amount=${claim}` : ''}`, {}, false)
      .then(setQuote)
      .catch((e) => setError((e as Error).message));
  }, [d.step, d.amount, service.slug]);

  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setD({ ...d, [k]: k === 'amount' ? (digits(e.target.value) ? Number(digits(e.target.value)).toLocaleString('ko-KR') : '') : e.target.value });
  const go = (s: number) => { setError(null); setD({ ...d, step: s }); };
  const here = `/intake/${service.slug}`;

  function addFiles(list: FileList | null) {
    if (!list) return;
    // FileList 는 input 과 연결된 실시간 객체라, 아래에서 input 을 비우면 같이 비워진다 — 먼저 배열로 복사한다
    const picked = Array.from(list);
    setFiles((prev) => [...prev, ...picked].slice(0, 30));
    if (fileInput.current) fileInput.current.value = '';
  }

  async function submit() {
    setError(null);
    try {
      setBusy('접수하는 중…');
      const c = await api<CaseDetail>('/cases', {
        method: 'POST',
        body: JSON.stringify({
          service_slug: service.slug,
          client_name: d.clientName,
          phone: d.phone,
          opponent_name: d.opponent || null,
          claim_amount: digits(d.amount) ? Number(digits(d.amount)) : null,
          facts: d.facts,
          source: document.referrer ? new URL(document.referrer).hostname.slice(0, 100) : null,
        }),
      });
      for (const [i, f] of files.entries()) {
        setBusy(`자료 올리는 중… (${i + 1}/${files.length})`);
        await upload(`/cases/${c.id}/files`, f);
      }
      if (isQuote) {
        sessionStorage.removeItem(key);
        router.push(`/my/cases/${c.id}`);
        return;
      }
      setBusy('결제창을 여는 중…');
      const result = await startPayment(c.id);
      if (result === 'canceled') { setBusy(null); return; }
      if (result !== 'redirected') {
        sessionStorage.removeItem(key);
        router.push(`/my/cases/${c.id}?paid=1`);
      }
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  const step = d.step;
  const canNext =
    step === 0 ? d.clientName.trim().length >= 2 && digits(d.phone).length >= 10
    : step === 1 ? (!service.claimRequired || !!digits(d.amount)) && d.facts.trim().length >= 10
    : true;

  return (
    <div className="card">
      <div className="sub" style={{ marginBottom: 8 }}>{step + 1} / {STEPS.length} · {STEPS[step]}</div>
      <div className="progress"><span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>

      <form onSubmit={(e) => { e.preventDefault(); if (step < STEPS.length - 1 && canNext) go(step + 1); }}>
        {step === 0 && (
          <>
            <div className="field"><label htmlFor="cn">의뢰인 성명</label><input id="cn" value={d.clientName} onChange={set('clientName')} required autoComplete="name" /></div>
            <div className="field"><label htmlFor="ph">연락처</label><input id="ph" value={d.phone} onChange={set('phone')} required type="tel" autoComplete="tel" placeholder="010-0000-0000" /></div>
            <div className="field">
              <label htmlFor="op">상대방 성명(상호)</label><input id="op" value={d.opponent} onChange={set('opponent')} />
              <span className="hint">이해충돌 확인에 사용합니다. 정확할수록 수임 검토가 빨라집니다.</span>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <div className="field">
              <label htmlFor="am">청구 금액(소가){service.claimRequired ? '' : ' (해당 시)'}</label>
              <input id="am" value={d.amount} onChange={set('amount')} inputMode="numeric" placeholder="예: 5,000,000" required={service.claimRequired} />
              <span className="hint">인지대·송달료 등 실비 계산에 사용합니다.</span>
            </div>
            <div className="field">
              <label htmlFor="fa">무슨 일이 있었나요?</label>
              <textarea id="fa" value={d.facts} onChange={set('facts')} placeholder="언제, 누구와, 무슨 일이 있었는지 날짜순으로 적어 주세요." maxLength={10000} />
              <span className="hint">{d.facts.length.toLocaleString()} / 10,000자</span>
            </div>
          </>
        )}
        {step === 2 && (
          <div className="field">
            <label>증거 자료</label>
            <div className="dropzone" onClick={() => fileInput.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}>
              <Paperclip size={18} /> 파일을 끌어 놓거나 눌러서 선택하세요
              <small>계약서·차용증, 이체내역, 대화 캡처 등 · 파일당 20MB · PDF·이미지·문서·음성</small>
            </div>
            <input ref={fileInput} type="file" multiple hidden onChange={(e) => addFiles(e.target.files)} />
            {files.length > 0 && (
              <ul className="file-list">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`}>
                    <span>{f.name}</span><small>{fmtSize(f.size)}</small>
                    <button type="button" aria-label={`${f.name} 빼기`} onClick={() => setFiles(files.filter((_, k) => k !== i))}><X size={14} /></button>
                  </li>
                ))}
              </ul>
            )}
            <span className="hint">지금 없어도 접수 후 내 사건 페이지에서 추가할 수 있습니다.</span>
          </div>
        )}
        {step === 3 && (
          isQuote ? (
            <p className="notice" style={{ marginBottom: 16 }}>심화 사건은 담당 변호사가 내용을 검토한 뒤 개별 견적을 안내해 드립니다. 견적을 확인하신 뒤 진행 여부를 정하시면 됩니다.</p>
          ) : !quote ? (
            <div className="spinner" style={{ margin: '24px auto' }} />
          ) : (
            <div className="table-wrap" style={{ marginBottom: 16 }}>
              <table className="table">
                <tbody>
                  <tr><td>수임료 ({quote.service_name})</td><td className="num">{won(quote.fee)}</td></tr>
                  <tr><td>부가세</td><td className="num">{won(quote.vat)}</td></tr>
                  {quote.costs.map((c) => (
                    <tr key={c.label}><td>{c.label}<span className="sub" style={{ display: 'block' }}>{c.note}</span></td><td className="num">{won(c.amount)}</td></tr>
                  ))}
                  <tr className="total-row"><td><b>결제 총액</b></td><td className="num">{won(quote.total)}</td></tr>
                </tbody>
              </table>
            </div>
          )
        )}

        {error && <p className="form-error" role="alert">{error}</p>}
        {busy && <p className="sub" role="status" style={{ marginBottom: 10 }}>{busy}</p>}

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" disabled={step === 0 || !!busy} onClick={() => go(step - 1)}>이전</button>
          {step < STEPS.length - 1 ? (
            <button type="submit" className="btn btn-primary" disabled={!canNext}>다음</button>
          ) : !ready ? (
            <button type="button" className="btn btn-primary" disabled>결제하기</button>
          ) : !user ? (
            <Link href={`/login?next=${encodeURIComponent(here)}`} className="btn btn-primary">로그인하고 {isQuote ? '상담 요청하기' : '결제하기'}</Link>
          ) : !user.is_onboarded ? (
            <Link href={`/signup?next=${encodeURIComponent(here)}`} className="btn btn-primary">가입 마무리하고 {isQuote ? '상담 요청하기' : '결제하기'}</Link>
          ) : (
            <button type="button" className="btn btn-primary" disabled={!!busy || (!isQuote && !quote)} onClick={submit}>
              {isQuote ? '상담 요청하기' : quote ? `${won(quote.total)} 결제하기` : '결제하기'}
            </button>
          )}
        </div>
        {step === STEPS.length - 1 && ready && !user && (
          <p className="sub" style={{ marginTop: 12 }}>
            입력하신 내용은 로그인 후에도 그대로 남아 있습니다.{files.length > 0 && ' 첨부 파일은 로그인 후 다시 선택해 주세요.'}
          </p>
        )}
        {step === STEPS.length - 1 && !isQuote && (
          <p className="sub" style={{ marginTop: 12 }}>담당 변호사가 수임을 확정하지 않으면 결제금액은 전액 환불됩니다.</p>
        )}
      </form>
    </div>
  );
}

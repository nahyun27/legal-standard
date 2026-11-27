'use client';

/**
 * 사건 상세의 "서면 초안" — AI 초안 생성·다시 생성(추가 프롬프트 저장)·직접 수정·버전 비교.
 * 초안은 직원에게만 보인다. 고객에게 가는 서면은 기존처럼 파일로 올리고 변호사 검수를 거친다.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Copy, GitCompare, Pencil, Sparkles } from 'lucide-react';
import { lineDiff } from '@/components/admin/diff';
import { api, fmtDate } from '@/lib/api';

export interface Draft {
  id: number; version: number; content: string; source: 'ai' | 'human'; status: 'generating' | 'ready' | 'failed';
  error: string | null; model: string | null; extra_prompt: string | null; base_version: number | null;
  exemplar_ids: number[]; flagged_citations: { kind: string; ref: string }[];
  input_tokens: number | null; output_tokens: number | null; latency_ms: number | null;
  created_by_name: string | null; created_at: string;
}

interface DraftList {
  items: Draft[];
  template: { title: string; placeholder: boolean; sections: string[]; allowed_citations: string[] };
  can_generate: boolean;
}

interface DraftingStatus { enabled: boolean; provider: string | null; model: string | null }

const short = (s: string, n = 40) => (s.length > n ? `${s.slice(0, n)}…` : s);

export default function DraftPanel({ caseId, onChange }: { caseId: number; onChange?: () => void }) {
  const [data, setData] = useState<DraftList | null>(null);
  const [st, setSt] = useState<DraftingStatus | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [extra, setExtra] = useState('');
  const [fromSelected, setFromSelected] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [showDiff, setShowDiff] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api<DraftList>(`/admin/cases/${caseId}/drafts`);
      setData(d);
      setSel((cur) => (cur !== null && d.items.some((x) => x.version === cur) ? cur : d.items[0]?.version ?? null));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [caseId]);

  useEffect(() => {
    load();
    api<DraftingStatus>('/admin/drafting/status').then(setSt).catch(() => setSt(null));
  }, [load]);

  const generating = data?.items.some((x) => x.status === 'generating') ?? false;
  useEffect(() => {
    if (!generating) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [generating, load]);

  const current = data?.items.find((x) => x.version === sel) ?? null;
  const base = current?.base_version ? data?.items.find((x) => x.version === current.base_version) ?? null : null;
  const diff = useMemo(() => (showDiff && current && base ? lineDiff(base.content, current.content) : null), [showDiff, current, base]);

  async function run(path: string, body: unknown, after?: () => void) {
    setBusy(true);
    setError(null);
    try {
      const d = await api<Draft>(`/admin/cases/${caseId}/${path}`, { method: 'POST', body: JSON.stringify(body) });
      after?.();
      await load();
      setSel(d.version);
      onChange?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function generate() {
    const baseVersion = fromSelected && current?.status === 'ready' ? current.version : undefined;
    run('drafts/generate', { extra_prompt: extra.trim() || undefined, base_version: baseVersion }, () => setExtra(''));
  }

  function startEdit() {
    setText(current?.content ?? '');
    setEditing(true);
    setShowDiff(false);
  }

  function saveEdit() {
    run('drafts', { content: text, base_version: current?.status === 'ready' ? current.version : undefined }, () => setEditing(false));
  }

  async function copy() {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('복사하지 못했습니다. 본문을 직접 선택해 복사해 주세요.');
    }
  }

  if (!data) return <section className="admin-card"><h2>서면 초안</h2>{error ? <p className="form-error">{error}</p> : <div className="spinner" />}</section>;

  const hasReady = data.items.some((x) => x.status === 'ready');

  return (
    <section className="admin-card draft-panel">
      <h2>서면 초안</h2>
      <p className="sub">
        {st?.enabled ? <>AI 초안 사용 가능 · {st.provider === 'fake' ? '개발용 가짜 모델' : st.model}</> : 'AI 초안 생성이 아직 설정되지 않았습니다. 직접 작성은 할 수 있습니다.'}
        {' · '}템플릿: {data.template.title}{data.template.placeholder && ' (임시안 — 변호사 템플릿으로 교체 예정)'}
      </p>
      <p className="sub">초안은 고객에게 보이지 않습니다. 확정한 서면은 아래 「서면 올리기」로 파일을 올려 검수를 요청하세요.</p>
      {error && <p className="form-error" role="alert">{error}</p>}

      {data.can_generate && (
        <div className="draft-gen">
          <div className="field">
            <label htmlFor="draft-extra">추가 지시 (선택 · 버전에 함께 저장)</label>
            <textarea id="draft-extra" value={extra} maxLength={2000} onChange={(e) => setExtra(e.target.value)}
              placeholder="예: 청구원인을 3문단 이내로 줄이고, 내용증명 발송 경과를 앞에 넣어 주세요" />
          </div>
          <div className="action-row">
            {hasReady && (
              <label className="consent" style={{ margin: 0 }}>
                <input type="checkbox" checked={fromSelected} onChange={(e) => setFromSelected(e.target.checked)} disabled={current?.status !== 'ready'} />
                선택한 버전(v{current?.version})을 바탕으로 고쳐 쓰기
              </label>
            )}
            <button className="btn btn-primary" disabled={busy || generating || !st?.enabled} onClick={generate}>
              <Sparkles size={15} /> {generating ? '생성 중…' : hasReady ? '다시 생성' : 'AI 초안 생성'}
            </button>
            {!editing && (
              <button className="btn btn-ghost" disabled={busy || generating} onClick={startEdit}>
                <Pencil size={15} /> {current ? '직접 수정' : '직접 작성'}
              </button>
            )}
          </div>
        </div>
      )}

      {data.items.length > 0 && (
        <div className="draft-body">
          <ol className="draft-versions">
            {data.items.map((d) => (
              <li key={d.version}>
                <button className={d.version === sel ? 'on' : ''} onClick={() => { setSel(d.version); setEditing(false); setShowDiff(false); }}>
                  <b>v{d.version}</b>
                  <span className={`draft-src s-${d.source}`}>{d.source === 'ai' ? 'AI' : '직접 수정'}</span>
                  {d.status === 'generating' && <span className="draft-src s-gen">생성 중</span>}
                  {d.status === 'failed' && <span className="draft-src s-fail">실패</span>}
                  <small>{d.created_by_name ?? '—'} · {fmtDate(d.created_at, true)}{d.base_version ? ` · v${d.base_version} 기반` : ''}</small>
                  {d.extra_prompt && <small className="draft-extra">“{short(d.extra_prompt)}”</small>}
                </button>
              </li>
            ))}
          </ol>

          <div className="draft-view">
            {editing ? (
              <>
                <textarea className="draft-editor" value={text} onChange={(e) => setText(e.target.value)} />
                <div className="action-row">
                  <button className="btn btn-primary" disabled={busy || !text.trim()} onClick={saveEdit}>새 버전으로 저장</button>
                  <button className="btn btn-ghost" disabled={busy} onClick={() => setEditing(false)}>취소</button>
                </div>
              </>
            ) : current ? (
              <>
                <div className="draft-meta">
                  {current.model && <span>모델 {current.model}</span>}
                  {current.latency_ms !== null && <span>{(current.latency_ms / 1000).toFixed(1)}초</span>}
                  {current.input_tokens !== null && <span>입력 {current.input_tokens.toLocaleString('ko-KR')} · 출력 {(current.output_tokens ?? 0).toLocaleString('ko-KR')} 토큰</span>}
                  {current.exemplar_ids.length > 0 && <span>예시 서면 {current.exemplar_ids.length}건 참고</span>}
                  <span className="draft-tools">
                    {base && <button className="link-btn" onClick={() => setShowDiff(!showDiff)}><GitCompare size={14} /> {showDiff ? '본문 보기' : `v${base.version}과 비교`}</button>}
                    {current.status === 'ready' && <button className="link-btn" onClick={copy}><Copy size={14} /> {copied ? '복사됨' : '복사'}</button>}
                  </span>
                </div>
                {current.extra_prompt && <p className="draft-prompt"><b>추가 지시</b> {current.extra_prompt}</p>}
                {current.flagged_citations.length > 0 && (
                  <div className="banner banner-warn" style={{ display: 'block', marginBottom: 10 }}>
                    <b><AlertTriangle size={15} style={{ verticalAlign: -3 }} /> 허용 목록에 없는 인용 {current.flagged_citations.length}건</b> — 원문을 확인하세요.
                    <ul style={{ margin: '6px 0 0 18px' }}>{current.flagged_citations.map((f) => <li key={f.ref}>{f.ref}</li>)}</ul>
                  </div>
                )}
                {current.status === 'generating' && <p className="sub"><span className="spinner inline" /> 초안을 만드는 중입니다. 1~2분 걸릴 수 있습니다.</p>}
                {current.status === 'failed' && <p className="form-error">{current.error ?? '생성에 실패했습니다.'}</p>}
                {current.status === 'ready' && (showDiff ? (
                  diff ? (
                    <pre className="draft-text draft-diff">
                      {diff.map((l, i) => <span key={i} className={`d-${l.type}`}>{l.type === 'add' ? '+ ' : l.type === 'del' ? '- ' : '  '}{l.text}{'\n'}</span>)}
                    </pre>
                  ) : <p className="sub">본문이 너무 길어 비교를 생략했습니다.</p>
                ) : <pre className="draft-text">{current.content}</pre>)}
              </>
            ) : null}
          </div>
        </div>
      )}
      {data.items.length === 0 && !editing && <p className="sub" style={{ marginTop: 8 }}>아직 초안이 없습니다.</p>}
      {data.items.length === 0 && editing && (
        <div className="draft-view">
          <textarea className="draft-editor" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="action-row">
            <button className="btn btn-primary" disabled={busy || !text.trim()} onClick={saveEdit}>새 버전으로 저장</button>
            <button className="btn btn-ghost" disabled={busy} onClick={() => setEditing(false)}>취소</button>
          </div>
        </div>
      )}
    </section>
  );
}

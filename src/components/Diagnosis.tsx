'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Pencil, RotateCcw } from 'lucide-react';
import { ServiceCard } from '@/components/ui';
import { DX_QUESTIONS, DX_RESULTS, DX_START, type DxOption, type DxProcedure } from '@/data/diagnosis';
import { AREA_LABEL, PREP, getService } from '@/data/services';
import type { Service } from '@/data/types';

/**
 * 내 상황 확인 — 한 화면에 질문 하나. 고른 답은 오른쪽 "선택한 내용"에 쌓이고 각각 [수정]으로 그 질문부터 다시 고른다.
 * 결과: 기한 경고 → 살펴볼 절차 → 고른 내용으로 본 이유 → 지금 할 일 → 준비서류 체크 → 상품.
 * 답은 이 화면에만 둔다(저장·전송하지 않음).
 */
interface Pick { qid: string; index: number }

const areaName = (a: DxProcedure['area']) => (a === 'consult' ? '상담' : AREA_LABEL[a]);

export default function Diagnosis() {
  const [picks, setPicks] = useState<Pick[]>([]);
  const top = useRef<HTMLDivElement>(null);

  // 지금 물을 질문 또는 도착한 결과
  const { qid, resultId } = useMemo(() => {
    let q = DX_START;
    for (const p of picks) {
      const opt = DX_QUESTIONS[p.qid].options[p.index];
      if (opt.result) return { qid: null, resultId: opt.result };
      q = opt.next!;
    }
    return { qid: q, resultId: null };
  }, [picks]);

  const chosen = picks.map((p) => ({ q: DX_QUESTIONS[p.qid], o: DX_QUESTIONS[p.qid].options[p.index] }));

  // 질문이 바뀌면 질문 카드 위치로(모바일에서 선택 후 화면 아래에 머무르지 않게)
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const el = top.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [picks.length]);

  const choose = (index: number) => qid && setPicks((ps) => [...ps, { qid, index }]);
  const back = () => setPicks((ps) => ps.slice(0, -1));
  const editAt = (i: number) => setPicks((ps) => ps.slice(0, i));
  const reset = () => setPicks([]);

  return (
    <div className="dx" ref={top}>
      <div className="dx-main">
        <ol className="dx-progress" aria-label="진행">
          <li className={picks.length === 0 ? 'on' : 'done'}>겪은 일</li>
          <li className={qid && picks.length > 0 ? 'on' : resultId ? 'done' : ''}>사실 확인</li>
          <li className={resultId ? 'on' : ''}>살펴볼 절차</li>
        </ol>

        {qid && <QuestionCard key={qid + picks.length} qid={qid} onChoose={choose} onBack={picks.length ? back : undefined} step={picks.length} />}
        {resultId && <ResultView id={resultId} options={chosen.map((c) => c.o)} onBack={back} onReset={reset} />}
      </div>

      <aside className="dx-side" aria-label="선택한 내용">
        <h2>선택한 내용</h2>
        {chosen.length === 0
          ? <p className="sub">지금 상황과 가장 가까운 항목부터 골라 주세요.</p>
          : (
            <ol className="dx-picked">
              {chosen.map(({ q, o }, i) => (
                <li key={q.id + i}>
                  <span className="dx-q">{q.title}</span>
                  <span className="dx-a">{o.label}</span>
                  <button type="button" className="dx-edit" onClick={() => editAt(i)} aria-label={`${q.title} 다시 고르기`}><Pencil size={13} /> 수정</button>
                </li>
              ))}
            </ol>
          )}
        <p className="note">고른 내용을 바탕으로 살펴볼 절차를 안내합니다. 받은 서류와 증거를 보면 달라질 수 있고, 최종 판단은 접수 뒤 담당 변호사가 합니다. 답한 내용은 저장하지 않습니다.</p>
      </aside>
    </div>
  );
}

function QuestionCard({ qid, onChoose, onBack, step }: { qid: string; onChoose: (i: number) => void; onBack?: () => void; step: number }) {
  const q = DX_QUESTIONS[qid];
  return (
    <section className="dx-card" aria-labelledby={`dx-${qid}`}>
      {step > 0 && <span className="eyebrow">조금만 더 확인할게요</span>}
      <h2 id={`dx-${qid}`}>{q.title}</h2>
      {q.hint && <p className="sub">{q.hint}</p>}
      <div className="dx-options" role="list">
        {q.options.map((o, i) => (
          <button key={o.label} type="button" role="listitem" className="dx-option" onClick={() => onChoose(i)}>
            <span>{o.label}</span><ArrowRight size={16} aria-hidden="true" />
          </button>
        ))}
      </div>
      {onBack && <button type="button" className="btn btn-ghost dx-back" onClick={onBack}><ArrowLeft size={16} /> 이전 질문</button>}
    </section>
  );
}

function ResultView({ id, options, onBack, onReset }: { id: string; options: DxOption[]; onBack: () => void; onReset: () => void }) {
  const r = DX_RESULTS[id];
  const tags = new Set(options.map((o) => o.tag).filter(Boolean));
  const extras = (r.extras ?? []).filter((x) => tags.has(x.tag));
  const procedures = [...r.procedures, ...extras.map((x) => x.procedure)];
  const facts = options.map((o) => o.fact).filter(Boolean) as string[];
  const services = uniq([...r.services, ...extras.map((x) => x.service)]).map(getService).filter(Boolean) as Service[];
  const related = (r.related ?? []).filter((s) => !services.some((x) => x.slug === s)).map(getService).filter(Boolean) as Service[];
  const main = services[0];

  return (
    <section className="dx-card dx-result" aria-labelledby="dx-result">
      <span className="eyebrow">내 상황에서 살펴볼 절차</span>
      <h2 id="dx-result">{r.headline}</h2>
      <p className="lead">{r.lead}</p>

      {r.deadline && (
        <p className="dx-deadline" role="note"><AlertTriangle size={18} aria-hidden="true" /><span><b>기한을 먼저 확인하세요.</b> {r.deadline} 상담이나 결제만으로 기한이 지켜지지는 않습니다.</span></p>
      )}

      <div className="dx-procs">
        {procedures.map((p) => (
          <article key={p.title} className="dx-proc">
            <span className="badge badge-kraft">{areaName(p.area)}</span>
            <h3>{p.title}</h3>
            <p>{p.what}</p>
            <dl>
              {p.doc !== '—' && <div><dt>필요한 서면</dt><dd>{p.doc}</dd></div>}
              {p.where !== '—' && <div><dt>어디에</dt><dd>{p.where}</dd></div>}
            </dl>
            {p.caution && <p className="dx-caution">{p.caution}</p>}
          </article>
        ))}
      </div>

      {facts.length > 0 && (
        <div className="dx-block">
          <h3>고른 내용으로 본 이유</h3>
          <ul className="check">{facts.map((f) => <li key={f}><Check size={14} /><span>{f}</span></li>)}</ul>
        </div>
      )}

      <div className="dx-block">
        <h3>지금 할 일</h3>
        <ol className="dx-todo">{r.todo.map((t) => <li key={t}>{t}</li>)}</ol>
      </div>

      {main && <PrepCheck service={main} />}

      {services.length > 0 && (
        <div className="dx-block">
          <h3>관련 서비스와 가격</h3>
          <div className="grid grid-2 dx-services">{services.map((s) => <ServiceCard key={s.slug} service={s} />)}</div>
        </div>
      )}
      {related.length > 0 && (
        <p className="dx-related">함께 살펴볼 수 있는 업무 {related.map((s) => <Link key={s.slug} href={`/services/${s.slug}`} className="chip">{s.name}</Link>)}</p>
      )}

      <p className="note" style={{ marginTop: 18 }}>이 안내는 고른 내용만으로 정리한 것이고 결과를 약속하지 않습니다. 결과는 사실관계와 증거, 법원·수사기관의 판단에 따라 달라집니다.</p>
      <div className="dx-actions">
        <button type="button" className="btn btn-ghost" onClick={onBack}><ArrowLeft size={16} /> 이전 답변</button>
        <button type="button" className="btn btn-ghost" onClick={onReset}><RotateCcw size={16} /> 처음부터 다시</button>
      </div>
    </section>
  );
}

// 준비서류 체크 — 가진 것을 체크하면 무엇이 남았는지 보여 준다(이 화면에만 둔다)
function PrepCheck({ service }: { service: Service }) {
  const items = PREP[service.prep];
  const [have, setHave] = useState<boolean[]>(() => items.map(() => false));
  const n = have.filter(Boolean).length;
  const toggle = (i: number) => setHave((h) => h.map((v, j) => (j === i ? !v : v)));
  return (
    <div className="dx-block dx-prep">
      <h3>준비서류 체크 <small>{service.name} 기준 · {n}/{items.length}</small></h3>
      <ul>
        {items.map((t, i) => (
          <li key={t}>
            <label><input type="checkbox" checked={have[i]} onChange={() => toggle(i)} /> <span>{t}</span></label>
          </li>
        ))}
      </ul>
      <p className="sub">
        {n === items.length
          ? '준비가 되었습니다. 접수하면서 자료를 올려 주세요.'
          : '지금 다 없어도 접수할 수 있습니다. 접수한 뒤 내 사건 페이지에서 추가할 수 있습니다.'}
      </p>
    </div>
  );
}

function uniq<T>(xs: T[]) { return [...new Set(xs)]; }

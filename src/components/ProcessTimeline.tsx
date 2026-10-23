'use client';

import { useEffect, useRef, useState } from 'react';

export interface ProcessStep { title: string; body: string; client: string; firm: string; time: string }

/** 세로 진행 타임라인 — 스크롤에 맞춰 왼쪽 진행선이 채워지고, 지나간 단계의 점이 켜진다. */
export default function ProcessTimeline({ steps }: { steps: ProcessStep[] }) {
  const wrap = useRef<HTMLOListElement>(null);
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const mid = window.innerHeight * 0.6;
      const p = Math.min(1, Math.max(0, (mid - r.top) / r.height));
      setProgress(p);
      const items = Array.from(el.querySelectorAll<HTMLElement>('.pt-step'));
      setActive(items.reduce((acc, it, i) => (it.getBoundingClientRect().top < mid ? i : acc), -1));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <ol ref={wrap} className="process-tl" style={{ '--p': progress } as React.CSSProperties}>
      {steps.map((s, i) => (
        <li key={s.title} className={`pt-step${i <= active ? ' on' : ''}`}>
          <span className="pt-dot">{i + 1}</span>
          <div className="pt-card">
            <div className="pt-head"><h3>{s.title}</h3><span className="pt-time">{s.time}</span></div>
            <p>{s.body}</p>
            <dl className="pt-who">
              <div><dt>고객이 할 일</dt><dd>{s.client}</dd></div>
              <div><dt>법인이 할 일</dt><dd>{s.firm}</dd></div>
            </dl>
          </div>
        </li>
      ))}
    </ol>
  );
}

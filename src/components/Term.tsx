'use client';

import { useEffect, useId, useRef, useState } from 'react';

/**
 * 용어 풀이 말풍선 — 마우스를 올리거나(hover 가능한 기기), 키보드로 포커스하거나, 누르면 열린다.
 * 휴대폰에는 hover 가 없어서 누르기로 열고, 바깥을 누르거나 Esc 로 닫는다.
 * 설명은 서버 HTML 에도 들어가야 check:copy 가 광고 금칙어를 검사할 수 있어서, 숨김 상태로 항상 렌더한다.
 */
export default function Term({ children, body }: { children: React.ReactNode; body: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrap = useRef<HTMLSpanElement>(null);
  const pop = useRef<HTMLSpanElement>(null);

  // 화면 가장자리에서 말풍선이 잘리지 않게 가로 위치를 당긴다
  function place() {
    const el = pop.current;
    if (!el) return;
    el.style.setProperty('--shift', '0px');
    const r = el.getBoundingClientRect();
    const gap = 12;
    const shift = r.left < gap ? gap - r.left : r.right > window.innerWidth - gap ? window.innerWidth - gap - r.right : 0;
    el.style.setProperty('--shift', `${shift}px`);
  }

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <span ref={wrap} className={`term${open ? ' open' : ''}`} onPointerEnter={place}>
      <button
        type="button"
        className="term-btn"
        aria-expanded={open}
        aria-describedby={id}
        onFocus={place}
        onClick={() => { place(); setOpen((v) => !v); }}
      >
        {children}
      </button>
      <span ref={pop} id={id} role="tooltip" className="term-pop">{body}</span>
    </span>
  );
}

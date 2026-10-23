'use client';

import { useEffect, useRef } from 'react';

/**
 * 화면에 들어올 때 살짝 떠오르며 나타나게 한다. 숨김 상태는 html.js 일 때만 적용되므로(layout 의 인라인 스크립트)
 * JS 가 안 도는 환경·검색엔진에서도 내용이 보인다. delay(ms)로 카드 순차 등장을 만든다.
 */
export default function Reveal({
  children, delay = 0, as: Tag = 'div', className = '', style,
}: {
  children: React.ReactNode; delay?: number; as?: 'div' | 'section' | 'li'; className?: string; style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add('in'); io.disconnect(); } },
      { rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={`reveal ${className}`.trim()}
      style={{ ...style, '--d': `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}

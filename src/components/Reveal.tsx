'use client';

import { useEffect, useRef } from 'react';

/**
 * 화면에 들어올 때 살짝 떠오르며 나타나게 한다. delay(ms)로 카드 순차 등장을 만든다.
 *
 * 숨김 상태(.js .reveal)는 RevealBoot 이 React 가 붙은 뒤에 body 에 'js' 를 달 때부터 적용된다.
 * - 그 전(서버 HTML·JS 실행 전·느린 기기)에는 모든 내용이 그대로 보인다.
 * - 붙는 순간 이미 화면 안에 있는 요소는 바로 'in' 을 달아 숨겼다 나타나는 깜빡임 없이 그대로 둔다.
 *   (자식 effect 가 부모 effect 보다 먼저 돌기 때문에 'js' 가 붙기 전에 'in' 이 먼저 붙는다)
 * - 화면 아래 요소만 스크롤해서 들어올 때 등장 애니메이션을 한다.
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
    const booted = document.body.classList.contains('js');
    // 첫 화면에 이미 보이는 요소는 애니메이션 없이 바로(탭 전환 등 이후에 새로 그려지는 요소는 애니메이션)
    if (!booted && el.getBoundingClientRect().top < window.innerHeight) {
      el.classList.add('in', 'instant');
      // 두 프레임 뒤 떼어 낸다 — 남겨 두면 그 안의 호버·스위치 전환 효과까지 꺼진다
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('instant')));
      return;
    }
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

/** 루트 레이아웃에 한 번 둔다 — React 가 붙은 뒤에 스크롤 등장 효과를 켠다. */
export function RevealBoot() {
  // <html> 의 class 는 React 가 관리(폰트 변수)하므로 건드리지 않는 <body> 에 단다
  useEffect(() => { document.body.classList.add('js'); }, []);
  return null;
}

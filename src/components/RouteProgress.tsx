'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * 페이지 이동 진행 바 — 내부 링크를 누르면 상단에 가는 띠가 차오르고, 주소가 바뀌면 끝까지 채운 뒤 사라진다.
 * 개발 서버처럼 첫 이동이 느린 환경에서도 "눌렸다"는 반응을 바로 준다.
 */
export default function RouteProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname.startsWith('/api/')) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      setState('loading');
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    setState((s) => (s === 'loading' ? 'done' : s));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState((s) => (s === 'done' ? 'idle' : s)), 450);
  }, [pathname, search]);

  return <div className={`route-progress ${state}`} aria-hidden="true" />;
}

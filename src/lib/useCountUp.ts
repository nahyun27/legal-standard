'use client';

import { useEffect, useRef, useState } from 'react';

/** 값이 바뀔 때 이전 값에서 새 값까지 숫자를 굴린다(ease-out). 모션 줄이기 설정이면 바로 바꾼다. */
export function useCountUp(target: number, duration = 520) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    if (start === target) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      from.current = target;
      setValue(target);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / duration);
      const v = Math.round(start + (target - start) * (1 - Math.pow(1 - k, 3)));
      from.current = v;
      setValue(v);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

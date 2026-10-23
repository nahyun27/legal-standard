'use client';

import Link from 'next/link';
import { useState } from 'react';
import { glossed } from '@/components/Glossed';
import type { Journey } from '@/data/types';
import { getService, serviceTitle } from '@/data/services';
import { priceLabel, priceLower, priceUpper } from '@/lib/format';
import { useCountUp } from '@/lib/useCountUp';

/**
 * 여정 시뮬레이터 — 단계별 가격과 "여기까지 가면 총 얼마"를 보여준다(프로토타입 .jstep / .jtotal 디자인).
 * 기본 경로(다툼 없이 끝나는 단계)는 항상 포함되고, 그 뒤의 조건부 단계(상대가 이의하면 등)는 스위치로 켜고 끈다.
 * 사업기획서 IV 차별화 1: 소비자가 최악의 시나리오 총비용을 알고 시작하게 하는 예측가능성.
 * 범위형 가격이 섞이면 총액도 "하한~상한"으로, 가격 미정 단계는 합계에서 빼고 그 사실을 표시한다.
 */
export default function JourneyTimeline({ journey }: { journey: Journey }) {
  const steps = journey.steps.map((st) => ({ ...st, service: getService(st.serviceSlug)! }));
  const [on, setOn] = useState<boolean[]>(() => steps.map((_, i) => i < journey.baseCaseSteps));

  const active = steps.filter((_, i) => on[i]);
  const lo = active.reduce((a, s) => a + (priceLower(s.service.price) ?? 0), 0);
  const hi = active.reduce((a, s) => a + (priceUpper(s.service.price) ?? 0), 0);
  const unpriced = active.some((s) => priceUpper(s.service.price) === null);
  const extra = on.slice(journey.baseCaseSteps).some(Boolean);

  const loShown = useCountUp(lo);
  const hiShown = useCountUp(hi);
  const fmt = (n: number) => n.toLocaleString('ko-KR');

  return (
    <div className="journey">
      {steps.map((s, i) => {
        const optional = i >= journey.baseCaseSteps;
        const priced = s.service.price.kind !== 'tbd' && s.service.price.kind !== 'quote';
        return (
          <div key={s.serviceSlug} className={`jstep${optional ? ' optional' : ''}${on[i] ? ' on' : ''}`} style={{ '--i': i } as React.CSSProperties}>
            <span className={`n${optional ? ' opt' : ''}`}>{i + 1}</span>
            <span className="t">
              {optional && s.trigger && <span className="trigger">{glossed(s.trigger)}</span>}
              <Link href={`/services/${s.service.slug}`}>{serviceTitle(s.service)}</Link>
              <small>{s.service.turnaround}</small>
            </span>
            <span className="pr">
              {optional && priced ? '+' : ''}{priceLabel(s.service.price)}
              {optional && (
                <label className="switch" title="이 단계까지 가는 경우를 총액에 포함">
                  <input
                    type="checkbox"
                    checked={on[i]}
                    onChange={() => setOn((prev) => prev.map((v, k) => (k === i ? !v : v)))}
                    aria-label={`${s.trigger ?? ''} ${serviceTitle(s.service)} 포함해 계산`}
                  />
                  <span aria-hidden="true" />
                </label>
              )}
            </span>
          </div>
        );
      })}
      <div className={`jtotal${extra ? ' worst' : ''}`} aria-live="polite">
        <span>{extra ? '선택한 단계까지 갈 때 총 서비스 요금' : `${journey.baseCaseLabel} 총 서비스 요금`}</span>
        <b>
          {lo === hi ? `${fmt(hiShown)}원` : `${fmt(loShown)}~${fmt(hiShown)}원`}
          {unpriced && <small> + 확정 예정 단계</small>}
        </b>
      </div>
      <p className="jmeta">
        VAT·실비 별도{steps.length > journey.baseCaseSteps && ' · 스위치를 켜면 그 단계까지 갈 때의 총액을 계산합니다'}
        {journey.successFee && <><br />{journey.successFee}</>}
      </p>
    </div>
  );
}

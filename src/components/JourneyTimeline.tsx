'use client';

import Link from 'next/link';
import { useState } from 'react';
import { glossed } from '@/components/Glossed';
import type { Journey, TrackKind } from '@/data/types';
import { TRACK_INFO, amountRange, getService, serviceTitle } from '@/data/services';
import { priceText } from '@/lib/format';
import { useCountUp } from '@/lib/useCountUp';

/**
 * 여정 시뮬레이터 — 단계별 가격과 "여기까지 가면 총 얼마"를 보여준다(프로토타입 .jstep / .jtotal 디자인).
 * 기본 경로(다툼 없이 끝나는 단계)는 항상 포함되고, 그 뒤의 조건부 단계(상대가 이의하면 등)는 스위치로 켜고 끈다.
 * 위의 방식 스위치(직접 제출 / 변호사 명의)로 단계별 가격을 바꿔 본다.
 * 구간형 가격이 섞이면 총액도 "하한~상한"으로, 가격 미정 단계는 합계에서 빼고 그 사실을 표시한다.
 */
export default function JourneyTimeline({ journey }: { journey: Journey }) {
  const steps = journey.steps.map((st) => ({ ...st, service: getService(st.serviceSlug)! }));
  const [on, setOn] = useState<boolean[]>(() => steps.map((_, i) => i < journey.baseCaseSteps));
  const [track, setTrack] = useState<TrackKind>('self');

  const active = steps.filter((_, i) => on[i]);
  const ranges = active.map((s) => amountRange(s.service, track));
  const lo = ranges.reduce((a, r) => a + (r?.[0] ?? 0), 0);
  const hi = ranges.reduce((a, r) => a + (r?.[1] ?? 0), 0);
  const unpriced = ranges.some((r) => r === null);
  const extra = on.slice(journey.baseCaseSteps).some(Boolean);

  const loShown = useCountUp(lo);
  const hiShown = useCountUp(hi);
  const fmt = (n: number) => n.toLocaleString('ko-KR');

  return (
    <div className="journey">
      <div className="track-toggle" role="radiogroup" aria-label="진행 방식">
        {(['self', 'atty'] as TrackKind[]).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={track === k} onClick={() => setTrack(k)}>{TRACK_INFO[k].title}</button>
        ))}
      </div>
      {steps.map((s, i) => {
        const optional = i >= journey.baseCaseSteps;
        const priced = amountRange(s.service, track) !== null;
        return (
          <div key={s.serviceSlug} className={`jstep${optional ? ' optional' : ''}${on[i] ? ' on' : ''}`} style={{ '--i': i } as React.CSSProperties}>
            <span className={`n${optional ? ' opt' : ''}`}>{i + 1}</span>
            <span className="t">
              {optional && s.trigger && <span className="trigger">{glossed(s.trigger)}</span>}
              <Link href={`/services/${s.service.slug}?track=${track}`}>{serviceTitle(s.service)}</Link>
              {s.service.turnaround && <small>{s.service.turnaround}</small>}
            </span>
            <span className="pr">
              {optional && priced ? '+' : ''}{priceText(s.service, track)}
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
        <span>{extra ? '선택한 단계까지 갈 때 총 서비스 요금' : `${journey.baseCaseLabel} 총 서비스 요금`} · {TRACK_INFO[track].title}</span>
        <b>
          {lo === hi ? `${fmt(hiShown)}원` : `${fmt(loShown)}~${fmt(hiShown)}원`}
          {unpriced && <small> + 확정 예정 단계</small>}
        </b>
      </div>
      <p className="jmeta">
        VAT·실비 별도{steps.length > journey.baseCaseSteps && ' · 스위치를 켜면 그 단계까지 갈 때의 총액을 계산합니다'}
      </p>
    </div>
  );
}

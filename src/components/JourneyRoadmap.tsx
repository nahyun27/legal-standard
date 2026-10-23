import type { Journey } from '@/data/types';
import { getService, serviceTitle } from '@/data/services';
import { priceLabel } from '@/lib/format';

/**
 * 여정 가로 로드맵 — 단계를 선으로 잇고, 화면에 들어오면 선이 왼쪽부터 그어진다(Reveal 안에서 .in 이 붙을 때).
 * 기본 경로 단계는 실선·진한 점, 조건부 단계(상대가 이의하면 등)는 점선·빈 점.
 */
export default function JourneyRoadmap({ journey }: { journey: Journey }) {
  const steps = journey.steps.map((st) => ({ ...st, service: getService(st.serviceSlug)! }));
  return (
    <ol className="roadmap" style={{ '--n': steps.length } as React.CSSProperties}>
      {steps.map((s, i) => {
        const optional = i >= journey.baseCaseSteps;
        return (
          <li key={s.serviceSlug} className={optional ? 'optional' : ''} style={{ '--i': i } as React.CSSProperties}>
            <span className="rm-node">{i + 1}</span>
            <span className="rm-when">{s.trigger ?? '시작'}</span>
            <b className="rm-name">{serviceTitle(s.service)}</b>
            <span className="rm-price">{i > 0 && s.service.price.kind !== 'tbd' ? '+' : ''}{priceLabel(s.service.price)}</span>
          </li>
        );
      })}
    </ol>
  );
}

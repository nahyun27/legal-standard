'use client';

import { ArrowDown, Check } from 'lucide-react';
import { focusTrack } from '@/components/ServicesBrowser';
import { TRACK_INFO, getService, trackOf } from '@/data/services';
import type { TrackKind } from '@/data/types';
import { won } from '@/lib/format';

const EXAMPLE = 'payment-order';

/**
 * 홈 히어로 아래 "두 가지 방식" — 반씩 나눈 비교 카드. 누르면 아래 서비스와 가격에서 그 방식을 강조한다.
 * 방식을 여기서 확정하지는 않는다(실제 선택은 상품 상세에서). 다른 방식 가격도 그대로 보인다.
 */
export default function TrackChooser() {
  const ex = getService(EXAMPLE)!;
  const pick = (k: TrackKind) => {
    focusTrack(k);
    document.getElementById('price')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <div className="track-split">
      {(['self', 'atty'] as TrackKind[]).map((k) => {
        const info = TRACK_INFO[k];
        const t = trackOf(ex, k)!;
        return (
          <div key={k} className={`track-card track-${k}`}>
            <h3>{info.title}</h3>
            <p className="track-lead">{info.lead}</p>
            <ul>{info.points.map((p) => <li key={p}><Check size={14} />{p}</li>)}</ul>
            <p className="track-ex">예) {ex.name} <b>{won(t.amount)}</b><small> (VAT 별도)</small></p>
            <button type="button" className="btn btn-ghost" onClick={() => pick(k)}>
              이 방식 가격 보기 <ArrowDown size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

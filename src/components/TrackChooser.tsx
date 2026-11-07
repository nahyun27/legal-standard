'use client';

import { ArrowDown, ArrowRight } from 'lucide-react';
import { focusTrack } from '@/components/ServicesBrowser';
import { DocStamp } from '@/components/ui';
import { ACTOR_LABEL, TRACK_COMMON, TRACK_INFO, getService, trackOf } from '@/data/services';
import type { Actor } from '@/data/services';
import type { TrackKind } from '@/data/types';
import { won } from '@/lib/format';

const EXAMPLE = 'payment-order';

function Who({ who }: { who: Actor }) {
  return <span className={`tf-who tf-who-${who}`}>{ACTOR_LABEL[who]}</span>;
}

/**
 * 홈 히어로 아래 "두 가지 방식" — 흐름도. 문진·변호사 검토까지는 같은 줄기, 그 뒤 두 갈래로 나뉜다.
 * 단계마다 누가 하는지(나 / 변호사) 배지로 보여 차이를 한눈에 비교하게 한다.
 * 누르면 아래 서비스와 가격에서 그 방식을 강조한다(방식 확정은 상품 상세에서).
 */
export default function TrackChooser() {
  const ex = getService(EXAMPLE)!;
  const pick = (k: TrackKind) => {
    focusTrack(k);
    document.getElementById('price')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const n0 = TRACK_COMMON.length;
  return (
    <div className="track-flow">
      <div className="tf-trunk">
        <span className="tf-tag">두 방식 공통</span>
        <ol>
          {TRACK_COMMON.map((s, i) => (
            <li key={s.text}>
              <i>{i + 1}</i>
              <span>{s.text}</span>
              <Who who={s.who} />
              {i < n0 - 1 && <ArrowRight className="tf-arrow" size={16} aria-hidden />}
            </li>
          ))}
        </ol>
      </div>

      <div className="tf-fork" aria-hidden><span /></div>

      <div className="track-split">
        {(['self', 'atty'] as TrackKind[]).map((k, idx) => {
          const info = TRACK_INFO[k];
          const t = trackOf(ex, k)!;
          return (
            <div key={k} className={`track-card track-${k}`}>
              <div className="track-head">
                <div>
                  <span className="track-opt">OPTION 0{idx + 1}</span>
                  <h3>{info.title}</h3>
                  <p className="track-lead">{info.lead}</p>
                </div>
                <DocStamp kind={k} title="지급명령 신청서" />
              </div>
              <p className="track-fit"><b>이런 분께 추천해요</b>{info.fit}</p>
              <ol className="tf-steps">
                {info.steps.map((s, i) => (
                  <li key={s.text}>
                    <i>{n0 + i + 1}</i>
                    <span>{s.text}{s.note && <small>{s.note}</small>}</span>
                    <Who who={s.who} />
                  </li>
                ))}
              </ol>
              <div className="track-ex">
                <b>{won(t.amount)}</b>
                <small>지급명령 신청서 기준 · VAT 별도</small>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => pick(k)}>
                가격 자세히 보기 <ArrowDown size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

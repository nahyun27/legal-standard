'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import Reveal from '@/components/Reveal';
import { ServiceCard } from '@/components/ui';
import { AREA_LABEL, AREA_NOTE, SERVICES, TRACK_INFO } from '@/data/services';
import type { Area, TrackKind } from '@/data/types';

type ListedArea = Exclude<Area, 'consult'>;
const AREAS = Object.keys(AREA_LABEL) as ListedArea[];

/** 히어로의 방식 카드 등 다른 곳에서 "이 방식 가격 보기"를 누르면 보내는 이벤트 */
export const TRACK_EVENT = 'ls:track-focus';

export function focusTrack(kind: TrackKind) {
  window.dispatchEvent(new CustomEvent<TrackKind>(TRACK_EVENT, { detail: kind }));
}

/**
 * 서비스와 가격 — 영역 탭(민사·형사·자문) + 방식 강조 스위치 + 진열 카드.
 * 두 방식의 가격은 항상 함께 보이고, 스위치는 고른 방식 쪽만 진하게 표시한다.
 * 주소에 ?track=self|atty, ?area=civil|criminal|advisory 가 있으면 그 상태로 연다.
 */
export default function ServicesBrowser() {
  const [area, setArea] = useState<ListedArea>('civil');
  const [focus, setFocus] = useState<TrackKind | undefined>();

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const t = q.get('track');
    const a = q.get('area');
    if (t === 'self' || t === 'atty') setFocus(t);
    if (a && (AREAS as string[]).includes(a)) setArea(a as ListedArea);
    const on = (e: Event) => setFocus((e as CustomEvent<TrackKind>).detail);
    window.addEventListener(TRACK_EVENT, on);
    return () => window.removeEventListener(TRACK_EVENT, on);
  }, []);

  const items = SERVICES.filter((s) => s.area === area)
    .sort((a, b) => Number(a.stage !== 'pilot') - Number(b.stage !== 'pilot'));

  return (
    <>
      <div className="catalog-bar">
        <div className="seg-tabs" role="tablist" aria-label="서비스 영역">
          {AREAS.map((a) => (
            <button key={a} role="tab" aria-selected={area === a} className={area === a ? 'on' : ''} onClick={() => setArea(a)}>
              {AREA_LABEL[a]}
              <small>{SERVICES.filter((s) => s.area === a).length}</small>
            </button>
          ))}
        </div>
        <div className="track-focus" role="group" aria-label="강조해서 볼 방식">
          <span>가격 보기</span>
          <button type="button" aria-pressed={!focus} onClick={() => setFocus(undefined)}>두 방식 모두</button>
          {(['self', 'atty'] as TrackKind[]).map((k) => (
            <button key={k} type="button" aria-pressed={focus === k} onClick={() => setFocus(k)}>{TRACK_INFO[k].title}</button>
          ))}
        </div>
      </div>
      <p className="area-note">{AREA_NOTE[area]}</p>
      {/* key 로 탭이 바뀔 때마다 카드를 다시 그려 등장 애니메이션을 준다 */}
      <div key={area} className="grid grid-3 shelf shelf-anim">
        {items.map((s, i) => (
          <Reveal key={s.slug} delay={Math.min(i, 5) * 60} className={s.stage === 'pilot' ? '' : 'is-upcoming'}>
            <ServiceCard service={s} focus={focus} />
          </Reveal>
        ))}
      </div>
      <Link href="/services/advanced" className="consult-link">
        <span><b>정해진 상품으로 맡기기 어려운 사건인가요?</b> 사건이 복잡하거나 금액이 크면 법무법인 변호사가 개별 상담하고 견적을 안내합니다.</span>
        <ArrowRight size={18} />
      </Link>
    </>
  );
}

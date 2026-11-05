'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { AddonLines, PriceRows, TrustSeal } from '@/components/ui';
import type { Service, TrackKind } from '@/data/types';
import { trackOf } from '@/data/services';
import { priceText } from '@/lib/format';

/**
 * 상품 상세의 가격 패널 + 모바일 하단 고정 바. 두 방식이 있는 상품은 여기서 방식을 고르고,
 * 고른 방식으로 문진을 시작한다(/intake/:slug?track=…). 주소의 ?track= 이 있으면 그 방식을 먼저 골라 둔다.
 */
export default function ServiceOrder({ service: s }: { service: Service }) {
  const tracks = s.tracks ?? [];
  const [track, setTrack] = useState<TrackKind | undefined>(tracks[0]?.kind);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('track');
    if (t === 'self' || t === 'atty') {
      if (s.tracks?.some((x) => x.kind === t)) setTrack(t);
    }
  }, [s.tracks]);

  const open = s.stage === 'pilot';
  const isQuote = s.price?.kind === 'quote';
  const chosen = trackOf(s, track);
  const href = `/intake/${s.slug}${chosen ? `?track=${chosen.kind}` : ''}`;
  const cta = isQuote ? '상담 요청하기' : '온라인 문진 시작';

  return (
    <>
      <aside className="price-panel">
        <div className="price-panel-tag">
          <span className="cat">정찰가</span>
          <span className="item">{s.name}</span>
          {tracks.length > 1 ? (
            <div className="track-pick" role="radiogroup" aria-label="진행 방식">
              {tracks.map((t) => (
                <button key={t.kind} type="button" role="radio" aria-checked={track === t.kind} onClick={() => setTrack(t.kind)}>
                  <span className="who">{t.label}{t.retainer && <span className="retainer">수임약정</span>}{t.note && <i>{t.note}</i>}</span>
                  <span className="pr">{t.amount.toLocaleString('ko-KR')}<small>원{t.per ? `/${t.per}` : ''}</small></span>
                </button>
              ))}
            </div>
          ) : (
            <PriceRows service={s} />
          )}
          <AddonLines service={s} />
          <ul>
            <li>VAT 별도</li>
            {s.turnaround && <li>{s.turnaround}</li>}
            {s.costs && <li>별도 실비: {s.costs.join(', ')}{tracks.length > 1 && ' (직접 제출은 제출할 때 직접 납부)'}</li>}
            {!isQuote && <li>수임하지 않으면 전액 환불</li>}
          </ul>
        </div>
        {open ? (
          <Link href={href} className="btn btn-primary btn-lg btn-block">
            {cta} <ArrowRight size={18} />
          </Link>
        ) : (
          <button className="btn btn-primary btn-lg btn-block" disabled>오픈 예정</button>
        )}
        <div className="price-panel-trust"><TrustSeal /></div>
      </aside>

      {/* 모바일: 고른 방식의 가격과 접수 버튼을 화면 아래에 고정 */}
      <div className="mobile-cta">
        <div>
          <small>{s.name}{chosen && tracks.length > 1 ? ` · ${chosen.label}` : ''}</small>
          <span className="price price-sm">{priceText(s, track)}</span>
        </div>
        {open ? <Link href={href} className="btn btn-primary">{cta}</Link> : <button className="btn btn-primary" disabled>오픈 예정</button>}
      </div>
    </>
  );
}

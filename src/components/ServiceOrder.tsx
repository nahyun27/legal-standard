'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { AddonLines, PriceRows, TrustSeal } from '@/components/ui';
import type { Service } from '@/data/types';
import { optionOf, optionTitle, orderOptions } from '@/data/services';
import { priceText } from '@/lib/format';

/**
 * 상품 상세의 가격 패널 + 모바일 하단 고정 바. 선택지가 여럿인 상품(두 방식·단계·장수 구간)은 여기서 고르고,
 * 고른 선택지로 문진을 시작한다(/intake/:slug?track=…). 주소의 ?track= 이 있으면 그 선택지를 먼저 골라 둔다.
 */
export default function ServiceOrder({ service: s }: { service: Service }) {
  const options = orderOptions(s);
  const [key, setKey] = useState<string | undefined>(options[0]?.key);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('track');
    if (t && optionOf(s, t)) setKey(t);
  }, [s]);

  const open = s.stage === 'pilot';
  const isQuote = s.price?.kind === 'quote';
  const chosen = optionOf(s, key);
  const href = `/intake/${s.slug}${chosen ? `?track=${chosen.key}` : ''}`;
  const cta = isQuote ? '상담 요청하기' : '온라인 문진 시작';

  return (
    <>
      <aside className="price-panel">
        <div className="price-panel-tag">
          <span className="cat">정찰가</span>
          <span className="item">{s.name}</span>
          {options.length > 1 ? (
            <div className="track-pick" role="radiogroup" aria-label={optionTitle(s)}>
              {options.map((o) => (
                <button key={o.key} type="button" role="radio" aria-checked={key === o.key} onClick={() => setKey(o.key)}>
                  <span className="who">{o.label}{o.retainer && <span className="retainer">수임약정</span>}{o.note && <i>{o.note}</i>}</span>
                  <span className="pr">{o.amount.toLocaleString('ko-KR')}<small>원{o.per ? `/${o.per}` : ''}</small></span>
                </button>
              ))}
            </div>
          ) : (
            <PriceRows service={s} />
          )}
          <AddonLines service={s} />
          <ul>
            <li>VAT 별도{s.unitCount && ` · ${s.unitCount.label} 1개 기준(개수만큼 곱함)`}</li>
            {s.turnaround && <li>{s.turnaround}</li>}
            {s.costs && <li>별도 실비: {s.costs.join(', ')}{s.tracks && s.tracks.length > 1 && ' (서면만 받기는 제출할 때 직접 납부)'}</li>}
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

      {/* 모바일: 고른 선택지의 가격과 접수 버튼을 화면 아래에 고정 */}
      <div className="mobile-cta">
        <div>
          <small>{s.name}{chosen && options.length > 1 ? ` · ${chosen.label}` : ''}</small>
          <span className="price price-sm">{priceText(s, key)}</span>
        </div>
        {open ? <Link href={href} className="btn btn-primary">{cta}</Link> : <button className="btn btn-primary" disabled>오픈 예정</button>}
      </div>
    </>
  );
}

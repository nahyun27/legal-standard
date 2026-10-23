import Link from 'next/link';
import { Check, Minus } from 'lucide-react';
import type { Service } from '@/data/types';
import { STAGE_LABEL, TIER_LABEL, serviceTitle } from '@/data/services';
import { priceLabel } from '@/lib/format';

export function PageHead({ eyebrow, title, lead }: { eyebrow?: string; title: string; lead?: string }) {
  return (
    <div className="container page-head">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      {lead && <p className="lead">{lead}</p>}
    </div>
  );
}

/** 정찰가 표기. 숫자는 정찰 레드, "원·VAT 별도"는 작게 — 프로토타입 .pr / .pr small */
export function Price({ service, size, note, compact }: { service: Service; size?: 'sm'; note?: string; compact?: boolean }) {
  // compact: 범위형을 "최솟값원~"으로 줄인다(진열 카드 폭에 맞춤, 프로토타입 "1,100,000원~")
  const p = compact && service.price.kind === 'range' ? { kind: 'from' as const, amount: service.price.min } : service.price;
  const priced = p.kind !== 'quote' && p.kind !== 'tbd';
  // 숫자만 크게, "원"부터는 작게(프로토타입 "190,000<small>원</small>"). 범위형은 "1,100,000~2,200,000원"
  const num =
    p.kind === 'fixed' || p.kind === 'from' ? p.amount.toLocaleString('ko-KR')
    : p.kind === 'range' ? `${p.min.toLocaleString('ko-KR')}~${p.max.toLocaleString('ko-KR')}`
    : priceLabel(p);
  return (
    <span className={`price${size === 'sm' ? ' price-sm' : ''}`}>
      {num}
      {priced && <span className="vat">원{p.kind === 'from' ? '~' : ''}{note ?? ' (VAT 별도)'}</span>}
    </span>
  );
}

export function StageBadge({ service }: { service: Pick<Service, 'stage'> }) {
  return (
    <span className={`badge ${service.stage === 'pilot' ? 'badge-good' : 'badge-warn'}`}>
      {STAGE_LABEL[service.stage]}
    </span>
  );
}

/** 진열대 상품 카드(프로토타입 .shelf .card). title·priceNote 는 홈에서 고소장 2단을 한 카드로 묶을 때 쓴다. */
export function ServiceCard({ service, title, priceNote }: { service: Service; title?: string; priceNote?: string }) {
  const highlights = service.highlights ?? service.includes.slice(0, 3);
  return (
    <Link href={`/services/${service.slug}`} className="card">
      {service.tag && <span className="mini-tag">{service.tag}</span>}
      <h3>{title ?? serviceTitle(service)}</h3>
      <p className="use">{service.summary}</p>
      <Price service={service} note={priceNote ?? ''} compact />
      <ul className="inc">
        {highlights.map((h) => <li key={h}>{h}</li>)}
      </ul>
    </Link>
  );
}

export function TierBadges({ service }: { service: Service }) {
  return (
    <div className="badges">
      <span className="badge badge-kraft">{TIER_LABEL[service.tier]}</span>
      <StageBadge service={service} />
    </div>
  );
}

export function CheckList({ items, negative }: { items: string[]; negative?: boolean }) {
  return (
    <ul className={`check${negative ? ' x' : ''}`}>
      {items.map((t) => (
        <li key={t}>
          {negative ? <Minus size={14} /> : <Check size={14} />}
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

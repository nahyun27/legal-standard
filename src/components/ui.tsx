import Link from 'next/link';
import { Check, ChevronRight, Minus, ShieldCheck } from 'lucide-react';
import type { Service } from '@/data/types';
import { STAGE_LABEL, TIER_LABEL, serviceTitle } from '@/data/services';
import { priceLabel } from '@/lib/format';

export interface Crumb { label: string; href?: string }

/**
 * 서브페이지 상단 영역 — 위치 표시(브레드크럼)·제목·설명 + 오른쪽 요약(aside).
 * 연한 종이 질감 배경에 진입 애니메이션. 모든 공개 서브페이지가 이 틀을 쓴다.
 */
export function PageHero({ eyebrow, title, lead, crumbs, aside, children }: {
  eyebrow?: string; title: string; lead?: string; crumbs?: Crumb[]; aside?: React.ReactNode; children?: React.ReactNode;
}) {
  return (
    <section className="page-hero">
      <div className={`container page-hero-grid${aside ? ' has-aside' : ''}`}>
        <div className="page-hero-copy">
          {crumbs && (
            <nav className="crumbs" aria-label="현재 위치">
              <Link href="/">홈</Link>
              {crumbs.map((c) => (
                <span key={c.label}>
                  <ChevronRight size={13} aria-hidden="true" />
                  {c.href ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
                </span>
              ))}
            </nav>
          )}
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h1>{title}</h1>
          {lead && <p className="lead">{lead}</p>}
          {children}
        </div>
        {aside && <div className="page-hero-aside">{aside}</div>}
      </div>
    </section>
  );
}

/** 이전 이름 호환 — 새 페이지는 PageHero 를 쓴다 */
export const PageHead = PageHero;

/**
 * 신뢰 인장 — "법무법인 소속 변호사 검토·서명". 광고 영역에서도 쓸 수 있는 사실 표현만 담는다(카피 가이드: 검토·서명·책임 허용).
 */
export function TrustSeal({ compact }: { compact?: boolean }) {
  return (
    <span className={`trust-seal${compact ? ' compact' : ''}`}>
      <span className="seal-mark" aria-hidden="true"><ShieldCheck size={compact ? 14 : 16} /></span>
      <span className="seal-text">
        <b>변호사 검토·서명</b>
        {!compact && <small>법무법인(유한) 에스제이파트너스</small>}
      </span>
    </span>
  );
}

/** 숫자·항목 한 줄 요약 칩(페이지 상단 aside 등) */
export function StatChips({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="stat-chips">
      {items.map((i) => (
        <div key={i.label}><dt>{i.label}</dt><dd>{i.value}</dd></div>
      ))}
    </dl>
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
    <Link href={`/services/${service.slug}`} className="card service-card">
      {service.tag && <span className="mini-tag">{service.tag}</span>}
      {service.stage !== 'pilot' && <span className="upcoming-label">{STAGE_LABEL[service.stage]}</span>}
      <h3>{title ?? serviceTitle(service)}</h3>
      <p className="use">{service.summary}</p>
      <Price service={service} note={priceNote ?? ''} compact />
      <ul className="inc">
        {highlights.map((h) => <li key={h}>{h}</li>)}
      </ul>
      <span className="card-more">자세히 보기 <ChevronRight size={14} /></span>
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

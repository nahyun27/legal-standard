import Link from 'next/link';
import { Check, ChevronRight, Minus, ShieldCheck } from 'lucide-react';
import type { Service, TrackKind } from '@/data/types';
import { AREA_LABEL, STAGE_LABEL } from '@/data/services';
import { priceText } from '@/lib/format';

export interface Crumb { label: string; href?: string }

/**
 * 서브페이지 상단 영역 — 위치 표시(브레드크럼)·제목·설명 + 오른쪽 요약(aside).
 * 연한 종이 질감 배경에 진입 애니메이션. 모든 공개 서브페이지가 이 틀을 쓴다.
 */
export function PageHero({ eyebrow, title, lead, crumbs, aside, children }: {
  eyebrow?: string; title: string; lead?: React.ReactNode; crumbs?: Crumb[]; aside?: React.ReactNode; children?: React.ReactNode;
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

/**
 * 두 방식을 도장으로 보여 주는 서면 미니 그림. 두 서면 모두 같은 "변호사 검토" 도장이 찍히고,
 * 제출하는 사람 자리의 도장만 다르다 — 서면만 받기는 의뢰인 도장(둥근 인감), 맡기기는 변호사 도장(네모 직인).
 */
export function DocStamp({ kind, title }: { kind: 'self' | 'atty'; title?: string }) {
  const atty = kind === 'atty';
  return (
    <figure className={`doc-stamp doc-${kind}`} aria-label={atty ? '변호사 도장으로 제출하는 서면' : '내 도장으로 제출하는 서면'}>
      <span className="doc-title">{title ?? '서면'}</span>
      <span className="doc-lines" aria-hidden="true"><i /><i /><i /><i /></span>
      <span className="seal seal-review" aria-hidden="true">변호사<br />검토</span>
      <span className="doc-sign">
        <span className="doc-role">{atty ? '대리인' : '제출인'}</span>
        <b>{atty ? '변호사' : '나'}</b>
        <span className={`seal ${atty ? 'seal-atty' : 'seal-self'}`} aria-hidden="true">{atty ? <>변호<br />사인</> : '의뢰인'}</span>
      </span>
    </figure>
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

const num = (n: number) => n.toLocaleString('ko-KR');

/**
 * 상품 가격 블록(시안 v5 카드의 .pricing / .bands / .stages). 두 방식 가격은 항상 함께 보여 준다(두 가격 동시 공개).
 * focus: 강조할 방식 — 홈 히어로나 가격 보기 스위치에서 고른 쪽을 진하게, 다른 쪽을 흐리게 한다.
 */
export function PriceRows({ service, focus }: { service: Service; focus?: TrackKind }) {
  if (service.tracks?.length) {
    return (
      <div className="prows">
        {service.tracks.map((t) => (
          <div key={t.kind} className={`prow prow-${t.kind}${focus ? (focus === t.kind ? ' is-focus' : ' is-dim') : ''}`}>
            <span className="who">
              {t.label}
              {t.retainer && <span className="retainer">수임약정</span>}
              {t.note && <i>{t.note}</i>}
            </span>
            <span className="pr">{num(t.amount)}<small>원{t.per ? `/${t.per}` : ''}</small></span>
          </div>
        ))}
      </div>
    );
  }
  if (service.bands?.length) {
    return (
      <div className="pbands">
        {service.bands.map((b) => (
          <div key={b.label}><span>{b.label}</span><b>{num(b.amount)}<small>원</small></b></div>
        ))}
      </div>
    );
  }
  if (service.ladder?.length) {
    return (
      <div className="prows">
        {service.ladder.map((r) => (
          <div key={r.label} className="prow">
            <span className="who">{r.label}{r.note && <i>{r.note}</i>}</span>
            <span className="pr">{num(r.amount)}<small>원</small></span>
          </div>
        ))}
      </div>
    );
  }
  return <span className="price price-sm">{priceText(service)}</span>;
}

/** 기일 출석처럼 횟수만큼 더해지는 요금 한 줄 */
export function AddonLines({ service }: { service: Service }) {
  if (!service.addons?.length) return null;
  return (
    <>
      {service.addons.map((a) => (
        <p key={a.label} className="addon">
          + <b>{a.label}</b> ({a.per}) · {a.options.map((o) => `${o.label} ${num(o.amount)}원`).join(' / ')}
        </p>
      ))}
    </>
  );
}

export function StageBadge({ service }: { service: Pick<Service, 'stage'> }) {
  return (
    <span className={`badge ${service.stage === 'pilot' ? 'badge-good' : 'badge-warn'}`}>
      {STAGE_LABEL[service.stage]}
    </span>
  );
}

/** 진열대 상품 카드(시안 v5 .card) — 이름, 쓰임, 방식별 가격, 추가 요금, 칩 */
export function ServiceCard({ service, focus }: { service: Service; focus?: TrackKind }) {
  return (
    <Link href={`/services/${service.slug}`} className="card service-card">
      {service.tag && <span className="mini-tag">{service.tag}</span>}
      {service.stage !== 'pilot' && <span className="upcoming-label">{STAGE_LABEL[service.stage]}</span>}
      <h3>{service.name}{service.unit && <small className="unit">{service.unit}</small>}</h3>
      <p className="use">{service.summary}</p>
      <PriceRows service={service} focus={focus} />
      <AddonLines service={service} />
      {service.chips && <div className="card-chips">{service.chips.map((c) => <span key={c}>{c}</span>)}</div>}
      <span className="card-more">자세히 보기 <ChevronRight size={14} /></span>
    </Link>
  );
}

export function AreaBadges({ service }: { service: Service }) {
  return (
    <div className="badges">
      {service.area !== 'consult' && <span className="badge badge-kraft">{AREA_LABEL[service.area]}</span>}
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

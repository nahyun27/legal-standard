import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Check, ChevronDown, ClipboardList, FileSignature, Minus, Send, UserCheck } from 'lucide-react';
import { glossed } from '@/components/Glossed';
import Reveal from '@/components/Reveal';
import { PageHero, Price, TierBadges, TrustSeal } from '@/components/ui';
import { FAQ } from '@/data/faq';
import { PREP_BY_CATEGORY, SERVICES, getService, serviceTitle } from '@/data/services';
import { priceLabel } from '@/lib/format';
import { pageMeta } from '@/lib/seo';

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<'/services/[slug]'>) {
  const s = getService((await params).slug);
  if (!s) return {};
  return pageMeta({ title: serviceTitle(s), description: s.summary, path: `/services/${s.slug}` });
}

export default async function ServiceDetail({ params }: PageProps<'/services/[slug]'>) {
  const s = getService((await params).slug);
  if (!s) notFound();
  const nexts = (s.next ?? []).map((n) => ({ ...n, service: getService(n.slug)! }));
  const open = s.stage === 'pilot';
  const isQuote = s.price.kind === 'quote';
  const ctaLabel = isQuote ? '상담 요청하기' : '온라인 문진 시작';
  const steps = [
    { icon: ClipboardList, title: '온라인 문진·자료 제출', body: '질문에 답하면서 있었던 일을 적고 증거를 올립니다. 15분쯤 걸립니다.' },
    { icon: UserCheck, title: '변호사 수임 검토', body: '담당 변호사가 24시간 안에 이해충돌이 없는지, 정해진 업무범위로 처리할 수 있는지 확인합니다.' },
    { icon: FileSignature, title: '서면 작성·검토·서명', body: `변호사가 검토하고 서명합니다(${s.turnaround}).` },
    { icon: Send, title: '발송·제출과 진행 조회', body: '발송하거나 제출한 뒤의 결과와 다음 단계는 내 사건 페이지에서 확인합니다.' },
  ];
  const seen = new Set<string>(); // 페이지에서 용어를 처음 한 번만 풀이한다
  const faqs = FAQ.filter((f) => ['표시된 가격 외에 추가 비용이 있나요?', '상대방이 이의하거나 사건이 커지면 어떻게 되나요?', '진행이 어려운 사건이면 어떻게 되나요?'].includes(f.q));

  return (
    <>
      <PageHero crumbs={[{ label: '서비스·가격', href: '/services' }, { label: serviceTitle(s) }]} title={serviceTitle(s)} lead={glossed(s.summary, seen)}>
        <div className="hero-badges"><TierBadges service={s} /></div>
      </PageHero>

      <div className="container detail detail-page">
        <div className="detail-main">
          <Reveal as="section" className="detail-block">
            <h2 className="block-title">업무범위</h2>
            <div className="scope">
              <div>
                <h3>포함 업무</h3>
                <ul className="scope-list">{s.includes.map((t) => <li key={t}><Check size={15} /><span>{glossed(t, seen)}</span></li>)}</ul>
              </div>
              <div>
                <h3>포함되지 않는 업무</h3>
                {s.excludes.length
                  ? <ul className="scope-list muted">{s.excludes.map((t) => <li key={t}><Minus size={15} /><span>{glossed(t, seen)}</span></li>)}</ul>
                  : <p className="sub">별도로 정한 제외 업무가 없습니다.</p>}
              </div>
            </div>
            {s.costs && <p className="note" style={{ marginTop: 14 }}>별도 실비: {glossed(s.costs.join(', '), seen)}. 정확한 금액은 결제 전 총액 화면에서 항목별로 보여 드립니다.</p>}
          </Reveal>

          <Reveal as="section" className="detail-block">
            <h2 className="block-title">진행 순서</h2>
            <ol className="flow-steps">
              {steps.map(({ icon: Icon, title, body }, i) => (
                <li key={title} style={{ '--i': i } as React.CSSProperties}>
                  <span className="flow-icon"><Icon size={18} /></span>
                  <b>{i + 1}. {title}</b>
                  <p>{glossed(body, seen)}</p>
                </li>
              ))}
            </ol>
          </Reveal>

          <Reveal as="section" className="detail-block">
            <h2 className="block-title">준비하면 좋은 자료</h2>
            <ul className="prep-list">{PREP_BY_CATEGORY[s.category].map((t) => <li key={t}>{t}</li>)}</ul>
            <p className="sub" style={{ marginTop: 10 }}>지금 다 없어도 됩니다. 접수한 뒤 내 사건 페이지에서 추가할 수 있습니다.</p>
          </Reveal>

          {nexts.length > 0 && (
            <Reveal as="section" className="detail-block">
              <h2 className="block-title">다음 단계와 가격</h2>
              <p className="sub" style={{ marginTop: -4, marginBottom: 14 }}>이 상품 다음에 이어질 수 있는 절차의 가격을 미리 알려드립니다.</p>
              <div className="next-steps">
                {nexts.map((n) => (
                  <Link key={n.slug} href={`/services/${n.slug}`} className="next-step">
                    <span className="next-when">{n.when}</span>
                    <span className="next-name">{serviceTitle(n.service)}</span>
                    <span className="next-price">{n.service.price.kind === 'tbd' ? '' : '+'}{priceLabel(n.service.price)}</span>
                    <ArrowRight size={16} className="next-arrow" />
                  </Link>
                ))}
              </div>
            </Reveal>
          )}

          <Reveal as="section" className="detail-block">
            <h2 className="block-title">자주 묻는 질문</h2>
            {faqs.map((f) => (
              <details key={f.q} className="faq">
                <summary>{f.q}</summary>
                <p>{glossed(f.a, seen)}</p>
              </details>
            ))}
            <Link href="/faq" className="sub" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12 }}>전체 질문 보기 <ChevronDown size={14} style={{ transform: 'rotate(-90deg)' }} /></Link>
          </Reveal>
        </div>

        <aside className="price-panel">
          <div className="price-panel-tag">
            <span className="cat">정찰가</span>
            <span className="item">{serviceTitle(s)}</span>
            <Price service={s} />
            <ul>
              <li>{s.turnaround}</li>
              {s.costs && <li>별도 실비: {s.costs.join(', ')}</li>}
              <li>수임하지 않으면 전액 환불</li>
            </ul>
          </div>
          {open ? (
            <Link href={`/intake/${s.slug}`} className="btn btn-primary btn-lg btn-block">{ctaLabel} <ArrowRight size={18} /></Link>
          ) : (
            <button className="btn btn-primary btn-lg btn-block" disabled>2027년 2월 오픈 예정</button>
          )}
          <div className="price-panel-trust"><TrustSeal /></div>
        </aside>
      </div>

      {/* 모바일: 가격과 접수 버튼을 화면 아래에 고정 */}
      <div className="mobile-cta">
        <div><small>{serviceTitle(s)}</small><Price service={s} size="sm" /></div>
        {open ? <Link href={`/intake/${s.slug}`} className="btn btn-primary">{ctaLabel}</Link> : <button className="btn btn-primary" disabled>오픈 예정</button>}
      </div>
    </>
  );
}

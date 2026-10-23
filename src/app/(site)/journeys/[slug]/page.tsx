import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import JourneyRoadmap from '@/components/JourneyRoadmap';
import JourneyTimeline from '@/components/JourneyTimeline';
import Reveal from '@/components/Reveal';
import { PageHero, StageBadge, TrustSeal } from '@/components/ui';
import { JOURNEYS, getJourney } from '@/data/journeys';
import { getService, serviceTitle } from '@/data/services';
import { pageMeta } from '@/lib/seo';

export function generateStaticParams() {
  return JOURNEYS.map((j) => ({ slug: j.slug }));
}

export async function generateMetadata({ params }: PageProps<'/journeys/[slug]'>) {
  const j = getJourney((await params).slug);
  if (!j) return {};
  return pageMeta({ title: j.name, description: j.summary, path: `/journeys/${j.slug}` });
}

export default async function JourneyDetail({ params }: PageProps<'/journeys/[slug]'>) {
  const j = getJourney((await params).slug);
  if (!j) notFound();
  const first = getService(j.steps[0].serviceSlug)!;

  return (
    <>
      <PageHero crumbs={[{ label: '단계별 총비용', href: '/journeys' }, { label: j.name }]} title={j.name} lead={j.summary}>
        <div className="hero-badges" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <StageBadge service={j} /><span className="sub"><b style={{ color: 'var(--ink)' }}>이런 분께</b> {j.who}</span>
        </div>
      </PageHero>

      <div className="container" style={{ paddingTop: 40 }}>
        <Reveal className="detail-block roadmap-block">
          <h2 className="block-title">한눈에 보는 단계</h2>
          <JourneyRoadmap journey={j} />
          <p className="sub" style={{ marginTop: 14 }}>점선 단계는 조건이 생길 때만 이어집니다. 각 단계는 그때 같은 사건 페이지에서 이어서 신청합니다.</p>
        </Reveal>
      </div>

      <div className="container detail detail-page">
        <Reveal className="detail-block">
          <h2 className="block-title">단계별 가격과 총액</h2>
          <JourneyTimeline journey={j} />
        </Reveal>
        <aside className="price-panel">
          <div className="detail-block start-card">
            <span className="eyebrow">Start here</span>
            <h3>첫 단계부터 시작하세요</h3>
            <p>다음 단계는 필요해질 때 같은 사건 페이지에서 이어서 신청합니다. 이미 낸 정보·자료는 다시 내지 않아도 됩니다.</p>
            <Link href={`/services/${first.slug}`} className="btn btn-primary btn-lg btn-block" style={{ marginTop: 16 }}>
              {serviceTitle(first)} 보기 <ArrowRight size={18} />
            </Link>
          </div>
          <div className="price-panel-trust"><TrustSeal /></div>
        </aside>
      </div>
    </>
  );
}

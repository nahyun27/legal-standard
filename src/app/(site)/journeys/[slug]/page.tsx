import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import JourneyRoadmap from '@/components/JourneyRoadmap';
import JourneyTimeline from '@/components/JourneyTimeline';
import { glossed } from '@/components/Glossed';
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
  const seen = new Set<string>();

  return (
    <>
      <PageHero crumbs={[{ label: '단계별 총비용', href: '/journeys' }, { label: j.name }]} title={j.name} lead={glossed(j.summary, seen)}>
        <div className="hero-badges" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <StageBadge service={j} /><span className="sub"><b style={{ color: 'var(--ink)' }}>이런 분께</b> {glossed(j.who, seen)}</span>
        </div>
      </PageHero>

      <div className="container" style={{ paddingTop: 40 }}>
        <Reveal className="detail-block roadmap-block">
          <h2 className="block-title">진행 단계</h2>
          <JourneyRoadmap journey={j} />
          <p className="sub" style={{ marginTop: 14 }}>점선으로 표시한 단계는 필요한 상황이 생겼을 때만 진행합니다. 그때 같은 사건 페이지에서 신청하시면 됩니다.</p>
        </Reveal>
      </div>

      <div className="container detail detail-page">
        <Reveal className="detail-block">
          <h2 className="block-title">단계별 가격과 총액</h2>
          <JourneyTimeline journey={j} />
        </Reveal>
        <aside className="price-panel">
          <div className="detail-block start-card">
            <h3>첫 단계만 먼저 신청하시면 됩니다</h3>
            <p>다음 단계는 필요해졌을 때 같은 사건 페이지에서 신청합니다. 이미 입력한 내용과 자료는 다시 내지 않아도 됩니다.</p>
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

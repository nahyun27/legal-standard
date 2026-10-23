import Link from 'next/link';
import { notFound } from 'next/navigation';
import JourneyTimeline from '@/components/JourneyTimeline';
import { StageBadge } from '@/components/ui';
import { JOURNEYS, getJourney } from '@/data/journeys';
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
  const first = j.steps[0].serviceSlug;

  return (
    <div className="container section">
      <div className="detail">
        <div>
          <div className="badges"><StageBadge service={j} /></div>
          <h1>{j.name}</h1>
          <p className="lead">{j.summary}</p>
          <div className="notice" style={{ marginTop: 24 }}>
            <b>이런 분께</b> — {j.who}
          </div>
          <div className="card-outline" style={{ marginTop: 24 }}>
            <h3>단계별 진행과 가격</h3>
            <JourneyTimeline journey={j} />
          </div>
        </div>
        <aside className="card">
          <h3>첫 단계부터 시작하세요</h3>
          <p>다음 단계는 필요해질 때 같은 사건 페이지에서 이어서 신청합니다. 이미 받은 서면·자료는 다시 내지 않아도 됩니다.</p>
          <Link href={`/services/${first}`} className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 16 }}>
            첫 단계 상품 보기
          </Link>
        </aside>
      </div>
    </div>
  );
}

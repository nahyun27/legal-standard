import Link from 'next/link';
import JourneyTimeline from '@/components/JourneyTimeline';
import Reveal from '@/components/Reveal';
import { PageHead, StageBadge } from '@/components/ui';
import { JOURNEYS } from '@/data/journeys';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: '여정 상품',
  description: '내용증명부터 집행까지, 고소장부터 이의신청까지 — 분쟁의 전 구간 가격을 미리 공개합니다.',
  path: '/journeys',
});

export default function JourneysPage() {
  return (
    <>
      <PageHead
        eyebrow="Journey"
        title="여정 상품"
        lead="분쟁은 서면 한 장으로 끝나지 않는 경우가 많습니다. 다음 단계로 넘어가는 조건과 그때의 비용을 처음부터 보여드립니다."
      />
      <div className="container grid grid-3" style={{ alignItems: 'start' }}>
        {JOURNEYS.map((j, i) => (
          <Reveal key={j.slug} delay={i * 110} className="card-outline">
            <div className="badges"><StageBadge service={j} /></div>
            <h2 style={{ fontSize: '1.2rem' }}>{j.name}</h2>
            <p style={{ marginTop: -6, marginBottom: 18 }}>{j.summary}</p>
            <JourneyTimeline journey={j} />
            <Link href={`/journeys/${j.slug}`} className="btn btn-ghost" style={{ marginTop: 16, width: '100%' }}>
              자세히 보기
            </Link>
          </Reveal>
        ))}
      </div>
    </>
  );
}

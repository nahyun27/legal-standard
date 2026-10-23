import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import JourneyTimeline from '@/components/JourneyTimeline';
import Reveal from '@/components/Reveal';
import { PageHero, StageBadge } from '@/components/ui';
import { JOURNEYS } from '@/data/journeys';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: '단계별 총비용',
  description: '내용증명부터 집행까지, 고소장부터 이의신청까지 — 분쟁의 전 구간 가격을 미리 공개합니다.',
  path: '/journeys',
});

const HOW = [
  { n: '1', title: '첫 단계를 정찰가로', body: '내용증명·고소장 등 첫 서면부터 시작합니다.' },
  { n: '2', title: '다음 단계는 조건부로', body: '상대가 이의하거나 불송치 결정이 나올 때만 이어집니다.' },
  { n: '3', title: '가격은 처음부터 공개', body: '어디까지 가든 각 단계의 가격과 업무범위가 미리 정해져 있습니다.' },
];

export default function JourneysPage() {
  return (
    <>
      <PageHero
        crumbs={[{ label: '단계별 총비용' }]}
        eyebrow="Journey"
        title="분쟁의 끝까지, 가격을 미리 압니다"
        lead="분쟁은 서면 한 장으로 끝나지 않는 경우가 많습니다. 다음 단계로 넘어가는 조건과 그때의 비용을 처음부터 보여드립니다."
        aside={
          <ol className="how-mini">
            {HOW.map((h) => <li key={h.n}><span>{h.n}</span><div><b>{h.title}</b><p>{h.body}</p></div></li>)}
          </ol>
        }
      />
      <section className="band" style={{ paddingTop: 48 }}>
        <div className="container journey-rows">
          {JOURNEYS.map((j, i) => (
            <Reveal key={j.slug} delay={i * 80} className="journey-row">
              <div className="journey-info">
                <StageBadge service={j} />
                <h2>{j.name}</h2>
                <p className="lead" style={{ marginTop: 8 }}>{j.summary}</p>
                <p className="journey-who"><b>이런 분께</b> {j.who}</p>
                <Link href={`/journeys/${j.slug}`} className="btn btn-ghost">단계별로 자세히 보기 <ArrowRight size={16} /></Link>
              </div>
              <div className="journey-sim">
                <span className="eyebrow" style={{ marginBottom: 6 }}>총비용 계산</span>
                <JourneyTimeline journey={j} />
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}

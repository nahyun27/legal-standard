import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import JourneyTimeline from '@/components/JourneyTimeline';
import { glossed } from '@/components/Glossed';
import Reveal from '@/components/Reveal';
import { PageHero, StageBadge } from '@/components/ui';
import { JOURNEYS } from '@/data/journeys';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: '단계별 총비용',
  description: '내용증명에서 강제집행까지, 고소장에서 이의신청까지 이어지는 단계별 가격을 미리 공개합니다.',
  path: '/journeys',
});

const HOW = [
  { n: '1', title: '첫 서면부터 시작', body: '내용증명이나 고소장처럼 처음 필요한 서면만 먼저 신청합니다.' },
  { n: '2', title: '필요할 때만 다음 단계로', body: '상대가 이의하거나 불송치 결정이 나왔을 때만 다음 절차를 신청합니다.' },
  { n: '3', title: '가격은 미리 정해져 있음', body: '어느 단계까지 가더라도 단계마다 가격과 업무범위가 정해져 있습니다.' },
];

export default function JourneysPage() {
  return (
    <>
      <PageHero
        crumbs={[{ label: '단계별 총비용' }]}
        title="단계별 총비용"
        lead="분쟁은 서면 한 번으로 끝나지 않을 때가 많습니다. 어떤 경우에 다음 단계로 넘어가는지, 그때 얼마가 드는지 미리 보여 드립니다."
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
                <p className="lead" style={{ marginTop: 8 }}>{glossed(j.summary)}</p>
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

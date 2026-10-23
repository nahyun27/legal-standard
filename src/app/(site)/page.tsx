import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import JourneyTimeline from '@/components/JourneyTimeline';
import PublicMetrics from '@/components/PublicMetrics';
import { glossed } from '@/components/Glossed';
import Reveal from '@/components/Reveal';
import SituationChips from '@/components/SituationChips';
import { ServiceCard, TrustSeal } from '@/components/ui';
import WhyPrice from '@/components/WhyPrice';
import { FAQ } from '@/data/faq';
import { PROMISES } from '@/data/promises';
import { JOURNEYS } from '@/data/journeys';
import { getService } from '@/data/services';
import { COPY } from '@/lib/copy';
import { won } from '@/lib/format';

// 광고 영역이다 — 문구는 lib/copy.ts 의 트랙(A/B)과 카피 가이드를 따른다. 비교·절약액·무료 표현 금지.
// 섹션 구성과 디자인은 의뢰인 프로토타입(홈페이지_최종_AB비교_리걸스탠다드.html 4.1)을 따른다.
// 프로토타입과 문구가 다른 곳(염가 표방 소지가 있는 "싸게·저렴" 등)은 README 의 "프로토타입과 다른 점" 참고.

// 진열대 6칸. 고소장은 기본형·표준형을 한 카드로 묶어 보여준다(프로토타입과 동일).
const SHELF: { slug: string; title?: string; priceNote?: string }[] = [
  { slug: 'certified-letter' },
  { slug: 'payment-order' },
  { slug: 'complaint-basic', title: '형사 고소장', priceNote: ' / 표준형 290,000원' },
  { slug: 'civil-complaint' },
  { slug: 'draft-review' },
  { slug: 'small-claims' },
];

export default function Home() {
  const hero = getService('payment-order')!;
  const journeys = JOURNEYS.filter((j) => j.stage === 'pilot');
  const [before, em, after] = COPY.heroTitle;

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">정찰제 법률서비스</span>
            <h1>{before}<em>{em}</em>{after}</h1>
            <p className="lead" style={{ marginTop: 20, maxWidth: 540 }}>{COPY.heroLead}</p>
            <div className="hero-actions">
              <Link href="/journeys" className="btn btn-primary">단계별 총비용 보기 <ArrowRight size={16} /></Link>
              <Link href="/services" className="btn btn-ghost">전체 가격표</Link>
            </div>
            <SituationChips />
            <div className="hero-trust"><TrustSeal /><p className="hero-note">{COPY.heroNote}</p></div>
          </div>
          <div className="tagbox">
            <Link href={`/services/${hero.slug}`} className="swingtag" aria-label={`${hero.name} 정찰가 보기`}>
              <div className="cat">정찰가</div>
              <div className="item">{hero.name}</div>
              <div className="price">
                {hero.price.kind === 'fixed' && won(hero.price.amount).replace('원', '')}
                <span className="vat">원 (VAT 별도)</span>
              </div>
              <div className="desc">전자소송 제출 포함 · 3영업일 안에 제출 · 이의가 들어오면 소송 가격도 공개</div>
            </Link>
          </div>
        </div>
      </section>

      <div className="strip">
        <div className="container">
          <span><b>정찰제</b>다음 단계 가격도 공개</span>
          <span><b>{COPY.stripQuality[0]}</b>{COPY.stripQuality[1]}</span>
          <span><b>온라인 접수</b>방문 없이 접수하고 진행 상황 확인</span>
        </div>
      </div>

      <PublicMetrics />

      <section className="band" id="journey">
        <div className="container">
          <h2>다음 단계에 드는 비용도 미리 알려 드립니다</h2>
          <p className="lead">
            내용증명으로 끝나지 않으면 지급명령, 상대가 이의하면 소송으로 넘어갑니다. 각 단계를 켜고 끄면서
            일이 길어졌을 때 전부 얼마가 드는지 계산해 보세요.
          </p>
          <div className="grid grid-2" style={{ marginTop: 42, gap: 24, alignItems: 'start' }}>
            {journeys.map((j, i) => (
              <Reveal key={j.slug} delay={i * 120} className="card-outline">
                <h3 style={{ marginBottom: 4 }}>{j.name}</h3>
                <p className="sub" style={{ marginBottom: 18 }}>{glossed(j.summary)}</p>
                <JourneyTimeline journey={j} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="band band-mist" id="price">
        <div className="container">
          <h2>서비스와 가격</h2>
          <p className="lead">모든 가격은 부가세 별도이며, 결제 전 화면에서 총액을 항목별로 확인할 수 있습니다.</p>
          <div className="grid grid-3 shelf">
            {SHELF.map(({ slug, title, priceNote }, i) => (
              <Reveal key={slug} delay={(i % 3) * 90}>
                <ServiceCard service={getService(slug)!} title={title} priceNote={priceNote} />
              </Reveal>
            ))}
          </div>
          <p className="note">
            사건이 복잡하거나 증거가 부족해 정해진 서비스로 진행하기 어려우면 결제 전이나 수임 검토 단계에서 개별 상담을 안내합니다.
            표시 가격에 인지대·송달료 같은 실비는 들어 있지 않습니다. 수임하지 않게 되면 결제금액은 전액 돌려드립니다.
          </p>
        </div>
      </section>

      <section className="band" id="why">
        <div className="container">
          <h2>이 가격이 가능한 이유</h2>
          <Reveal><WhyPrice /></Reveal>
          <Link href="/about#why" className="text-link">운영 방식 자세히 보기 <ArrowRight size={15} /></Link>
        </div>
      </section>

      <section className="band band-ink">
        <div className="container">
          <h2>의뢰인께 드리는 약속</h2>
          <p className="lead">가격을 낮췄다고 변호사가 지는 책임이 줄지는 않습니다.</p>
          <div className="grid grid-3" style={{ marginTop: 40, gap: 20 }}>
            {PROMISES.map((p, i) => (
              <Reveal key={p.title} delay={i * 110} className="tcell">
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="band" id="faq">
        <div className="container">
          <h2>자주 묻는 질문</h2>
          <div style={{ marginTop: 16 }}>
            {FAQ.slice(0, 5).map((f) => (
              <details key={f.q} className="faq">
                <summary>{f.q}</summary>
                <p>{glossed(f.a)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="band band-mist final">
        <div className="container">
          <Reveal>
            <h2>먼저 가격부터 확인해 보세요</h2>
            <p>지금 필요한 서비스와 다음 단계의 가격을 보고 결정하셔도 됩니다. 접수는 질문에 답하는 방식이라 15분쯤 걸립니다.</p>
            <Link href="/journeys" className="btn btn-primary btn-lg">단계별 총비용 보기 <ArrowRight size={18} /></Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import JourneyTimeline from '@/components/JourneyTimeline';
import PublicMetrics from '@/components/PublicMetrics';
import Reveal from '@/components/Reveal';
import SituationChips from '@/components/SituationChips';
import { ServiceCard } from '@/components/ui';
import WhyPrice from '@/components/WhyPrice';
import { FAQ } from '@/data/faq';
import { JOURNEYS } from '@/data/journeys';
import { getService } from '@/data/services';
import { COPY } from '@/lib/copy';
import { won } from '@/lib/format';

// 광고 영역이다 — 문구는 lib/copy.ts 의 트랙(A/B)과 카피 가이드를 따른다. 비교·절약액·무료 표현 금지.
// 섹션 구성과 디자인은 의뢰인 프로토타입(홈페이지_최종_AB비교_리걸스탠다드.html 4.1)을 따른다.
// 프로토타입과 문구가 다른 곳(염가 표방 소지가 있는 "싸게·저렴" 등)은 README 의 "프로토타입과 다른 점" 참고.
const PROMISES = [
  { title: COPY.qualityTitle, body: COPY.qualityBody },
  { title: '인용 검증 시스템', body: '서면에 인용되는 법령·판례는 실존 여부를 확인한 뒤 변호사가 재검토합니다. 오류가 발견되면 보완해 드립니다.' },
  { title: '비밀 유지', body: '사건 자료는 암호화하여 보관하며, 고객의 사건 정보를 외부 시스템의 학습에 사용하지 않습니다. 변호사법상 비밀유지의무가 전 과정에 적용됩니다.' },
];

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
              <Link href="/journeys" className="btn btn-primary">여정 상품 보기 <ArrowRight size={16} /></Link>
              <Link href="/services" className="btn btn-ghost">전체 가격표</Link>
            </div>
            <SituationChips />
            <p className="hero-note">{COPY.heroNote}</p>
          </div>
          <div className="tagbox">
            <Link href={`/services/${hero.slug}`} className="swingtag" aria-label={`${hero.name} 정찰가 보기`}>
              <div className="cat">STANDARD PRICE</div>
              <div className="item">{hero.name}</div>
              <div className="price">
                {hero.price.kind === 'fixed' && won(hero.price.amount).replace('원', '')}
                <span className="vat">원 (VAT 별도)</span>
              </div>
              <div className="desc">전자소송 제출 포함 · 표준 납기 3영업일 · 이의 시 소송 전환 정찰가 공개</div>
            </Link>
          </div>
        </div>
      </section>

      <div className="strip">
        <div className="container">
          <span><b>정찰제</b>다음 단계 비용까지 공개</span>
          <span><b>{COPY.stripQuality[0]}</b>{COPY.stripQuality[1]}</span>
          <span><b>온라인 완결</b>접수부터 진행 조회까지</span>
        </div>
      </div>

      <PublicMetrics />

      <section className="band" id="journey">
        <div className="container">
          <span className="eyebrow">Journey pricing</span>
          <h2>분쟁의 끝까지, 가격을 미리 압니다</h2>
          <p className="lead">
            서면 한 장만 파는 곳은 많습니다. 리걸스탠다드는 그다음 단계가 와도 얼마인지 처음부터 알려드립니다.
            단계마다 스위치를 켜서 최악의 경우까지의 총비용을 확인해 보세요.
          </p>
          <div className="grid grid-2" style={{ marginTop: 42, gap: 24, alignItems: 'start' }}>
            {journeys.map((j, i) => (
              <Reveal key={j.slug} delay={i * 120} className="card-outline">
                <h3 style={{ marginBottom: 4 }}>{j.name}</h3>
                <p className="sub" style={{ marginBottom: 18 }}>{j.summary}</p>
                <JourneyTimeline journey={j} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="band band-mist" id="price">
        <div className="container">
          <span className="eyebrow">Services &amp; prices</span>
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
            사건의 난이도·증거 상태에 따라 표준 서비스로 진행이 어려운 경우 결제 전 또는 수임 검토 단계에서 심화 상담(개별 견적)을 안내합니다.
            표시 가격은 인지대·송달료 등 실비를 포함하지 않으며, 수임이 확정되지 않은 경우 결제금액은 전액 반환됩니다.
          </p>
        </div>
      </section>

      <section className="band" id="why">
        <div className="container">
          <span className="eyebrow">Why this price</span>
          <h2>어떻게 이 가격이 가능한가요</h2>
          <Reveal><WhyPrice /></Reveal>
        </div>
      </section>

      <section className="band band-ink">
        <div className="container">
          <span className="eyebrow">Our promise</span>
          <h2>가격은 정찰제로, 책임은 끝까지</h2>
          <p className="lead">가격은 공정의 결과일 뿐, 책임의 크기는 줄이지 않았습니다.</p>
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
          <span className="eyebrow">FAQ</span>
          <h2>자주 묻는 질문</h2>
          <div style={{ marginTop: 16 }}>
            {FAQ.slice(0, 5).map((f) => (
              <details key={f.q} className="faq">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="band band-mist final">
        <div className="container">
          <Reveal>
            <h2>가격을 먼저 확인하세요.<br />끝까지의 비용까지도요.</h2>
            <p>지금 필요한 서비스의 정찰가와 다음 단계 비용을 확인하고, 15분 문진으로 접수해 보세요.</p>
            <Link href="/journeys" className="btn btn-primary btn-lg">여정 상품 보기 <ArrowRight size={18} /></Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}

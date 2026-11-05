import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import JourneyTimeline from '@/components/JourneyTimeline';
import PublicMetrics from '@/components/PublicMetrics';
import { glossed } from '@/components/Glossed';
import Reveal from '@/components/Reveal';
import ServicesBrowser from '@/components/ServicesBrowser';
import SituationChips from '@/components/SituationChips';
import TrackChooser from '@/components/TrackChooser';
import { TrustSeal } from '@/components/ui';
import WhyPrice from '@/components/WhyPrice';
import { FAQ } from '@/data/faq';
import { PROMISES } from '@/data/promises';
import { JOURNEYS } from '@/data/journeys';
import { getService } from '@/data/services';
import { COPY } from '@/lib/copy';

// 광고 영역이다 — 문구는 lib/copy.ts 의 트랙(A/B)과 카피 가이드를 따른다. 비교·절약액·무료 표현 금지.
// 구성은 의뢰인 시안 v5 를 따른다: 같은 서면의 두 가지 방식(직접 제출 / 변호사 명의)과 그 가격을 함께 공개.

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
              <Link href="#price" className="btn btn-primary">서비스·가격 보기 <ArrowRight size={16} /></Link>
              <Link href="/journeys" className="btn btn-ghost">단계별 총비용</Link>
            </div>
            <SituationChips />
            <div className="hero-trust"><TrustSeal /><p className="hero-note">{COPY.heroNote}</p></div>
          </div>
          <div className="tagbox">
            <Link href={`/services/${hero.slug}`} className="swingtag swingtag-duo" aria-label={`${hero.name} 정찰가 보기`}>
              <div className="cat">정찰가</div>
              <div className="item">{hero.name}</div>
              <div className="duo">
                {hero.tracks!.map((t) => (
                  <div key={t.kind}><span>{t.label}</span><b>{t.amount.toLocaleString('ko-KR')}<small>원</small></b></div>
                ))}
              </div>
              <div className="desc">VAT 별도 · 3영업일 안에 완성 · 이의가 들어오면 소송 가격도 공개</div>
            </Link>
          </div>
        </div>
      </section>

      <section className="band band-tight" id="tracks">
        <div className="container">
          <h2>두 가지 방식, 같은 검토</h2>
          <p className="lead">차이는 누구 이름으로 내고, 그 뒤 절차를 누가 맡느냐입니다. 어느 쪽이 맞을지 비교해 보세요.</p>
          <TrackChooser />
        </div>
      </section>

      <div className="strip">
        <div className="container">
          <span><b>두 가지 가격</b>직접 제출·변호사 명의 동시 공개</span>
          <span><b>{COPY.stripQuality[0]}</b>{COPY.stripQuality[1]}</span>
          <span><b>온라인 접수</b>방문 없이 접수하고 진행 상황 확인</span>
        </div>
      </div>

      <PublicMetrics />

      <section className="band band-mist" id="price">
        <div className="container">
          <h2>서비스와 가격</h2>
          <p className="lead">모든 가격은 부가세 별도이며, 결제 전 화면에서 총액을 항목별로 확인할 수 있습니다.</p>
          <div style={{ marginTop: 32 }}><ServicesBrowser /></div>
          <p className="note">
            표시 가격에 인지대·송달료 같은 실비는 들어 있지 않습니다. 「수임약정」 표시는 전자 수임약정을 맺고 진행하는 방식입니다.
            담당 변호사가 수임하지 않기로 하면 결제금액은 전액 돌려드립니다.
          </p>
        </div>
      </section>

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
            <h2>가격을 먼저 확인하세요</h2>
            <p>방식은 그다음에 고르셔도 됩니다. 접수는 질문에 답하는 방식이라 15분쯤 걸립니다.</p>
            <Link href="#price" className="btn btn-primary btn-lg">서비스·가격 보기 <ArrowRight size={18} /></Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}

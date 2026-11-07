import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import AloneCompare from '@/components/AloneCompare';
import HomeConcerns from '@/components/HomeConcerns';
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
import { getService, trackOf } from '@/data/services';
import { COPY } from '@/lib/copy';
import type { TrackKind } from '@/data/types';

const TAG_SUB: Record<TrackKind, string> = { self: '변호사 검토 후 직접 제출', atty: '제출·보정·송달 대응 포함' };
/** 150000 → "15만 원" (만 원 단위로 떨어지는 가격만 홈 제목에 쓴다) */
const manwon = (n: number) => (n % 10_000 === 0 ? `${n / 10_000}만 원` : `${n.toLocaleString('ko-KR')}원`);

// 광고 영역이다 — 문구는 lib/copy.ts 의 트랙(A/B)과 카피 가이드를 따른다. 비교·절약액·무료 표현 금지.
// 구성은 의뢰인 시안 v5 를 따른다: 같은 서면의 두 가지 방식(서면만 받기 / 변호사에게 맡기기)과 그 가격을 함께 공개.

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
              <Link href="#price" className="btn btn-primary">서비스·가격 확인하기 <ArrowRight size={16} /></Link>
              <Link href="#tracks" className="btn btn-ghost">진행 방식 비교하기</Link>
            </div>
            <SituationChips />
            <div className="hero-trust"><TrustSeal /><p className="hero-note">{COPY.heroNote}</p></div>
          </div>
          <div className="tagbox">
            <Link href={`/services/${hero.slug}`} className="swingtag swingtag-duo" aria-label={`${hero.name} 가격 비교 보기`}>
              <div className="cat">가격 비교</div>
              <div className="item">지급명령 신청서</div>
              <div className="duo">
                {hero.tracks!.map((t) => (
                  <div key={t.kind}>
                    <span>{t.label}<small>{TAG_SUB[t.kind]}</small></span>
                    <b>{t.amount.toLocaleString('ko-KR')}<small>원</small></b>
                  </div>
                ))}
              </div>
              <div className="desc">VAT·실비 별도 · 추가 비용이 생기는 경우는 미리 안내</div>
            </Link>
          </div>
        </div>
      </section>

      <section className="band band-tight band-mist" id="concerns">
        <div className="container">
          <h2>이런 고민, 혼자 하고 계신가요</h2>
          <HomeConcerns />
        </div>
      </section>

      <section className="band band-tight" id="tracks">
        <div className="container">
          <span className="eyebrow">서면만 받을까, 맡길까</span>
          <h2>직접 제출하면 {manwon(trackOf(hero, 'self')!.amount)}.<br />맡기면 {manwon(trackOf(hero, 'atty')!.amount)}.</h2>
          <p className="basis">지급명령 신청 기준 · VAT·실비 별도</p>
          <p className="lead">서면은 모두 변호사가 검토합니다. 차이는 제출과 그 뒤 절차를 누가 진행하느냐입니다.</p>
          <TrackChooser />
        </div>
      </section>

      <div className="strip">
        <div className="container">
          <span><b>가격은</b>미리 확인하고,</span>
          <span><b>{COPY.stripQuality[0]}</b>{COPY.stripQuality[1]}</span>
          <span><b>접수는</b>온라인으로.</span>
        </div>
      </div>

      <section className="band band-tight" id="alone">
        <div className="container">
          <h2>혼자 쓸 때와 무엇이 다른가요</h2>
          <p className="lead">서식만 채운 서면은 꼭 들어가야 할 내용이 빠지기 쉽습니다.</p>
          <Reveal><AloneCompare /></Reveal>
        </div>
      </section>

      <PublicMetrics />

      <section className="band band-mist" id="price">
        <div className="container">
          <h2>서비스와 가격</h2>
          <p className="lead">부가세는 별도입니다. 실비까지 더한 총액은 결제하기 전에 보여 드립니다.</p>
          <div style={{ marginTop: 32 }}><ServicesBrowser /></div>
          <p className="note">
            인지대·송달료 같은 실비는 표시 가격에 들어 있지 않습니다. 「수임약정」이 붙은 방식은 온라인으로 수임약정을 맺고 진행합니다.
            변호사가 사건을 맡지 않기로 하면 결제하신 돈은 전부 돌려드립니다.
          </p>
        </div>
      </section>

      <section className="band" id="journey">
        <div className="container">
          <h2>일이 길어지면 얼마가 더 드나요</h2>
          <p className="lead">
            내용증명을 보내도 돈을 안 주면 지급명령을, 상대가 이의하면 소송을 하게 됩니다.
            단계를 눌러 보면 거기까지 가는 데 드는 돈이 모두 합쳐 나옵니다.
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
          <h2>왜 이 가격인가요</h2>
          <Reveal><WhyPrice /></Reveal>
          <Link href="/about#why" className="text-link">운영 방식 자세히 보기 <ArrowRight size={15} /></Link>
        </div>
      </section>

      <section className="band band-ink">
        <div className="container">
          <h2>어떤 상품이든 지키는 것</h2>
          <p className="lead">가격과 상관없이 모든 사건에 똑같이 적용합니다.</p>
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
            <h2>내 사건 가격부터 보세요</h2>
            <p>접수는 질문에 답하면서 진행하고 15분쯤 걸립니다. 변호사가 맡지 않기로 하면 결제하신 돈은 전부 돌려드립니다.</p>
            <Link href="#price" className="btn btn-primary btn-lg">서비스·가격 보기 <ArrowRight size={18} /></Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}

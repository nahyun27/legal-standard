import Link from 'next/link';
import { ArrowRight, Building2, FileCheck2, Mail, Phone, Scale, ShieldCheck, UserRound } from 'lucide-react';
import Reveal from '@/components/Reveal';
import { PageHero, TrustSeal } from '@/components/ui';
import WhyPrice from '@/components/WhyPrice';
import { PROMISES } from '@/data/promises';
import { pageMeta } from '@/lib/seo';
import { FIRM } from '@/lib/site';

export const metadata = pageMeta({
  title: '소개',
  description: `${FIRM.brand}는 ${FIRM.name}가 운영하는 정찰제 법률서비스입니다.`,
  path: '/about',
});

const PRINCIPLES = [
  { icon: Scale, title: '주체는 언제나 법무법인', body: '법률상담·수임·서면 확정·명의·소송대리는 모두 법인 소속 변호사가 수행합니다.' },
  { icon: FileCheck2, title: '정형적인 사건만 표준화', body: '요건사실과 서면 구조가 정해진 사건만 표준 업무범위·표준 가격의 상품으로 만듭니다.' },
  { icon: ShieldCheck, title: '맞지 않는 사건은 받지 않습니다', body: '표준 범위를 넘는 사건은 정찰제 상품으로 받지 않고, 처음부터 법인 본체의 담당 변호사가 상담합니다.' },
];

// TODO: 검토 변호사 프로필(성명·자격·검수 분야) — 의뢰인 자료를 받으면 채운다. 방안 A 전환 시 검토변호사 성명 표시와 연결.
const LAWYERS = [1, 2, 3];

export default function AboutPage() {
  return (
    <>
      <PageHero
        crumbs={[{ label: '소개' }]}
        eyebrow="About"
        title="법무법인이 직접 운영합니다"
        lead={`${FIRM.brand}는 ${FIRM.name}의 브랜드 사업부입니다. 상담·수임·서면·소송대리의 주체는 처음부터 끝까지 법무법인입니다.`}
      >
        <div style={{ marginTop: 22 }}><TrustSeal /></div>
      </PageHero>

      <section className="band">
        <div className="container">
          <span className="eyebrow">Principles</span>
          <h2>운영 원칙</h2>
          <div className="grid grid-3" style={{ marginTop: 28 }}>
            {PRINCIPLES.map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} delay={i * 90} className="principle">
                <span className="principle-icon"><Icon size={20} /></span>
                <h3>{title}</h3>
                <p>{body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="band band-mist" id="why">
        <div className="container">
          <span className="eyebrow">Why this price</span>
          <h2>이 가격이 가능한 이유</h2>
          <p className="lead" style={{ marginTop: 0 }}>가격은 공정의 결과입니다. 줄어든 것은 반복 작업이고, 변호사의 책임은 그대로입니다.</p>
          <Reveal><WhyPrice /></Reveal>
        </div>
      </section>

      <section className="band band-ink">
        <div className="container">
          <span className="eyebrow">Our promise</span>
          <h2>가격은 정찰제로, 책임은 끝까지</h2>
          <div className="grid grid-3" style={{ marginTop: 32, gap: 20 }}>
            {PROMISES.map((p, i) => (
              <Reveal key={p.title} delay={i * 110} className="tcell"><h3>{p.title}</h3><p>{p.body}</p></Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="container">
          <span className="eyebrow">Structure</span>
          <h2>운영 구조</h2>
          <Reveal className="org">
            <div className="org-node org-root"><Building2 size={20} /><b>{FIRM.name}</b><small>수임·명의·책임의 주체</small></div>
            <div className="org-branches">
              <div className="org-node"><b>{FIRM.brand}</b><small>정형 사건 정찰제 상품 · 온라인 접수</small></div>
              <div className="org-node"><b>법인 본체</b><small>비정형·고액 사건 개별 수임</small></div>
            </div>
            <p className="sub" style={{ marginTop: 16, textAlign: 'center' }}>표준 범위를 넘는 사건은 리걸스탠다드에서 법인 본체 담당 변호사에게 바로 연결됩니다.</p>
          </Reveal>
        </div>
      </section>

      <section className="band band-mist">
        <div className="container">
          <span className="eyebrow">Lawyers</span>
          <h2>검토 변호사</h2>
          <p className="lead" style={{ marginTop: 0 }}>모든 서면은 아래 소속 변호사가 검토하고 서명합니다.</p>
          <div className="grid grid-3" style={{ marginTop: 28 }}>
            {LAWYERS.map((n, i) => (
              <Reveal key={n} delay={i * 90} className="lawyer-card">
                <span className="lawyer-photo"><UserRound size={34} /></span>
                <b>검토 변호사</b>
                <small>소개 준비 중</small>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="container contact-grid">
          <div>
            <span className="eyebrow">Contact</span>
            <h2>문의</h2>
            <p className="lead" style={{ marginTop: 0 }}>온라인 접수는 상시 가능합니다. 접수 후 진행 상황은 내 사건 페이지에서 확인하실 수 있습니다.</p>
            <Link href="/services" className="btn btn-primary" style={{ marginTop: 20 }}>서비스·가격 보기 <ArrowRight size={16} /></Link>
          </div>
          <dl className="contact-card">
            <div><dt><Phone size={16} /> 대표전화</dt><dd>{FIRM.tel}</dd></div>
            <div><dt><Mail size={16} /> 이메일</dt><dd>{FIRM.email}</dd></div>
            <div><dt><Building2 size={16} /> 주사무소</dt><dd>{FIRM.address}</dd></div>
            <div><dt>운영 시간</dt><dd>{FIRM.hours}</dd></div>
          </dl>
        </div>
      </section>
    </>
  );
}

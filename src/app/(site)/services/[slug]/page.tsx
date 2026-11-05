import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Check, ChevronDown, ClipboardList, FileSignature, Minus, Send, UserCheck } from 'lucide-react';
import { glossed } from '@/components/Glossed';
import Reveal from '@/components/Reveal';
import ServiceOrder from '@/components/ServiceOrder';
import { AddonLines, AreaBadges, PageHero, PriceRows } from '@/components/ui';
import { FAQ } from '@/data/faq';
import { PREP, SERVICES, TRACK_INFO, getService, serviceTitle } from '@/data/services';
import { priceText } from '@/lib/format';
import { pageMeta } from '@/lib/seo';

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<'/services/[slug]'>) {
  const s = getService((await params).slug);
  if (!s) return {};
  return pageMeta({ title: serviceTitle(s), description: s.summary, path: `/services/${s.slug}` });
}

export default async function ServiceDetail({ params }: PageProps<'/services/[slug]'>) {
  const s = getService((await params).slug);
  if (!s) notFound();
  const nexts = (s.next ?? []).map((n) => ({ ...n, service: getService(n.slug)! }));
  const twoWays = (s.tracks?.length ?? 0) > 1;
  const steps = [
    { icon: ClipboardList, title: '온라인 문진·자료 제출', body: '질문에 답하면서 있었던 일을 적고 증거를 올립니다. 15분쯤 걸립니다.' },
    { icon: UserCheck, title: '변호사 수임 검토', body: '담당 변호사가 24시간 안에 이해충돌이 없는지, 정해진 업무범위로 처리할 수 있는지 확인합니다.' },
    { icon: FileSignature, title: '서면 작성·검토', body: `변호사가 검토하고 확정합니다${s.turnaround ? `(${s.turnaround})` : ''}.${s.tracks?.some((t) => t.retainer) ? ' 수임약정이 필요한 방식은 이때 전자 수임약정을 맺습니다.' : ''}` },
    { icon: Send, title: '전달 또는 제출', body: twoWays ? '직접 제출 방식은 서면과 제출 안내서를 받고, 변호사 명의 방식은 변호사가 제출한 뒤 진행 상황을 알려 드립니다.' : '결과와 다음 단계는 내 사건 페이지에서 확인합니다.' },
  ];
  const seen = new Set<string>(); // 페이지에서 용어를 처음 한 번만 풀이한다
  const faqs = FAQ.filter((f) => [
    ...(twoWays ? ['「내가 직접 제출」과 「변호사 명의」는 무엇이 다른가요?'] : []),
    '표시된 가격 외에 추가 비용이 있나요?', '상대방이 이의하거나 사건이 커지면 어떻게 되나요?', '진행이 어려운 사건이면 어떻게 되나요?',
  ].includes(f.q));

  return (
    <>
      <PageHero
        crumbs={[{ label: '서비스·가격', href: '/services' }, { label: serviceTitle(s) }]}
        title={serviceTitle(s)}
        lead={<>{s.unit && <b className="hero-unit">{s.unit}</b>}{glossed(s.summary, seen)}</>}
      >
        <div className="hero-badges"><AreaBadges service={s} /></div>
      </PageHero>

      <div className="container detail detail-page">
        <div className="detail-main">
          {twoWays && (
            <Reveal as="section" className="detail-block">
              <h2 className="block-title">두 가지 방식</h2>
              <p className="sub" style={{ marginTop: -4, marginBottom: 14 }}>어느 방식이든 서면은 담당 변호사가 검토합니다. 오른쪽에서 방식을 골라 접수하세요.</p>
              <div className="way-compare">
                {s.tracks!.map((t) => (
                  <div key={t.kind} className={`way way-${t.kind}`}>
                    <h3>{t.label}{t.retainer && <span className="retainer">수임약정</span>}</h3>
                    <p className="way-price">{priceText(s, t.kind)} <small>VAT 별도</small></p>
                    {t.note && <p className="way-note">{t.note}</p>}
                    <ul className="scope-list">{TRACK_INFO[t.kind].points.map((x) => <li key={x}><Check size={15} /><span>{x}</span></li>)}</ul>
                  </div>
                ))}
              </div>
            </Reveal>
          )}

          {(s.bands || s.ladder || s.addons || s.screening) && (
            <Reveal as="section" className="detail-block">
              <h2 className="block-title">{s.bands ? '장수 구간별 가격' : s.ladder ? '단계별 가격' : '추가 요금'}</h2>
              {(s.bands || s.ladder) && <PriceRows service={s} />}
              <AddonLines service={s} />
              {s.screening && <p className="screen"><b>정찰가로 맡는 조건</b> {glossed(s.screening, seen)}</p>}
              {s.chips && s.bands && <p className="note" style={{ marginTop: 12 }}>{s.chips.join(' · ')}</p>}
            </Reveal>
          )}

          {(s.includes || s.excludes) && (
            <Reveal as="section" className="detail-block">
              <h2 className="block-title">업무범위</h2>
              <div className="scope">
                <div>
                  <h3>포함 업무</h3>
                  <ul className="scope-list">{(s.includes ?? []).map((t) => <li key={t}><Check size={15} /><span>{glossed(t, seen)}</span></li>)}</ul>
                </div>
                <div>
                  <h3>포함되지 않는 업무</h3>
                  {s.excludes?.length
                    ? <ul className="scope-list muted">{s.excludes.map((t) => <li key={t}><Minus size={15} /><span>{glossed(t, seen)}</span></li>)}</ul>
                    : <p className="sub">별도로 정한 제외 업무가 없습니다.</p>}
                </div>
              </div>
            </Reveal>
          )}
          {s.costs && (
            <p className="note" style={{ marginTop: -8, marginBottom: 24 }}>
              별도 실비: {glossed(s.costs.join(', '), seen)}. {twoWays ? '직접 제출 방식은 제출할 때 직접 내시고, 변호사 명의 방식은 결제할 때 함께 받습니다. ' : ''}정확한 금액은 결제 전 총액 화면에서 항목별로 보여 드립니다.
            </p>
          )}

          <Reveal as="section" className="detail-block">
            <h2 className="block-title">진행 순서</h2>
            <ol className="flow-steps">
              {steps.map(({ icon: Icon, title, body }, i) => (
                <li key={title} style={{ '--i': i } as React.CSSProperties}>
                  <span className="flow-icon"><Icon size={18} /></span>
                  <b>{i + 1}. {title}</b>
                  <p>{glossed(body, seen)}</p>
                </li>
              ))}
            </ol>
          </Reveal>

          <Reveal as="section" className="detail-block">
            <h2 className="block-title">준비하면 좋은 자료</h2>
            <ul className="prep-list">{PREP[s.prep].map((t) => <li key={t}>{t}</li>)}</ul>
            <p className="sub" style={{ marginTop: 10 }}>지금 다 없어도 됩니다. 접수한 뒤 내 사건 페이지에서 추가할 수 있습니다.</p>
          </Reveal>

          {nexts.length > 0 && (
            <Reveal as="section" className="detail-block">
              <h2 className="block-title">다음 단계와 가격</h2>
              <p className="sub" style={{ marginTop: -4, marginBottom: 14 }}>이 상품 다음에 이어질 수 있는 절차의 가격을 미리 알려드립니다.</p>
              <div className="next-steps">
                {nexts.map((n) => (
                  <Link key={n.slug} href={`/services/${n.slug}`} className="next-step">
                    <span className="next-when">{n.when}</span>
                    <span className="next-name">{serviceTitle(n.service)}</span>
                    <span className="next-price">+{priceText(n.service)}</span>
                    <ArrowRight size={16} className="next-arrow" />
                  </Link>
                ))}
              </div>
            </Reveal>
          )}

          <Reveal as="section" className="detail-block">
            <h2 className="block-title">자주 묻는 질문</h2>
            {faqs.map((f) => (
              <details key={f.q} className="faq">
                <summary>{f.q}</summary>
                <p>{glossed(f.a, seen)}</p>
              </details>
            ))}
            <Link href="/faq" className="sub" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12 }}>전체 질문 보기 <ChevronDown size={14} style={{ transform: 'rotate(-90deg)' }} /></Link>
          </Reveal>
        </div>

        <ServiceOrder service={s} />
      </div>
    </>
  );
}

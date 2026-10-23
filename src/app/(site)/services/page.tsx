import Link from 'next/link';
import { BadgeCheck, Receipt, Route } from 'lucide-react';
import Reveal from '@/components/Reveal';
import ServicesBrowser from '@/components/ServicesBrowser';
import { PageHero, StageBadge, StatChips, TrustSeal } from '@/components/ui';
import { SERVICES, TIER_LABEL, serviceTitle } from '@/data/services';
import type { Tier } from '@/data/types';
import { priceLabel } from '@/lib/format';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: '서비스·가격',
  description: '내용증명, 지급명령, 고소장, 소송대리까지 모든 상품의 가격과 업무범위.',
  path: '/services',
});

const PRINCIPLES = [
  { icon: Receipt, title: '정해진 가격', body: '표시된 가격이 수임료의 전부입니다. 부가세와 인지대·송달료 같은 실비는 결제 전에 항목별로 보여 드립니다.' },
  { icon: Route, title: '다음 단계 가격도 공개', body: '상대방이 이의하거나 불송치 결정이 나왔을 때 이어지는 절차의 가격과 업무범위도 미리 볼 수 있습니다.' },
  { icon: BadgeCheck, title: '수임하지 않으면 전액 환불', body: '담당 변호사가 검토한 뒤 정해진 서비스로 진행하기 어렵다고 판단하면 결제금액을 전부 돌려드립니다.' },
];

const TIERS: { tier: Tier; desc: string }[] = [
  { tier: 'T1', desc: '변호사가 검토하고 서명한 서면을 제출하거나 발송해 드립니다.' },
  { tier: 'T1R', desc: '직접 쓰신 초안을 내기 전에 변호사가 검토해 고치고 서명합니다.' },
  { tier: 'T2', desc: '업무범위를 미리 정해 두고 소송이나 수사 단계를 대리합니다. 성공보수율도 미리 공개합니다.' },
  { tier: 'T3', desc: '복잡하거나 금액이 큰 사건은 법무법인 본체 변호사가 개별 상담합니다.' },
];

export default function ServicesPage() {
  const open = SERVICES.filter((s) => s.stage === 'pilot').length;
  return (
    <>
      <PageHero
        crumbs={[{ label: '서비스·가격' }]}
        title="서비스·가격"
        lead="가격은 상품마다 정해져 있고 따로 협의하지 않습니다. 지금 상황을 고르면 맞는 서비스와 다음 단계 가격이 함께 나옵니다."
        aside={
          <StatChips items={[
            { label: '지금 접수 가능', value: `${open}개 서비스` },
            { label: '내용증명부터', value: '55,000원' },
            { label: '표준 납기', value: '2~5영업일' },
          ]} />
        }
      >
        <div style={{ marginTop: 22 }}><TrustSeal /></div>
      </PageHero>

      <section className="band" style={{ paddingTop: 48 }}>
        <div className="container">
          <ServicesBrowser />
          <p className="note">
            표시 가격은 부가세 별도입니다. 사건의 난이도·증거 상태에 따라 표준 서비스로 진행이 어려운 경우 결제 전 또는 수임 검토 단계에서 심화 상담을 안내합니다.
          </p>
        </div>
      </section>

      <section className="band band-mist">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>가격 원칙</h2>
            </div>
          </div>
          <div className="grid grid-3">
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

      <section className="band">
        <div className="container">
          <details className="price-table-toggle">
            <summary>
              <span><b>전체 가격표</b> 모든 상품의 정찰가·처리 기간을 한 표로 봅니다</span>
            </summary>
            {TIERS.map(({ tier, desc }) => (
              <div key={tier} className="price-tier">
                <h3>{TIER_LABEL[tier]} <span className="sub">{desc}</span></h3>
                <div className="table-wrap">
                  <table className="table price-table">
                    <thead><tr><th>상품</th><th>내용</th><th>처리 기간</th><th style={{ textAlign: 'right' }}>정찰가</th></tr></thead>
                    <tbody>
                      {SERVICES.filter((s) => s.tier === tier).map((s) => (
                        <tr key={s.slug}>
                          <td><Link href={`/services/${s.slug}`}><b>{serviceTitle(s)}</b></Link><div style={{ marginTop: 4 }}><StageBadge service={s} /></div></td>
                          <td>{s.summary}</td>
                          <td className="sub">{s.turnaround}</td>
                          <td className="num">{priceLabel(s.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </details>
        </div>
      </section>
    </>
  );
}

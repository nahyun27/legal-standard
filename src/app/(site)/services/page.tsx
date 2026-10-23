import Link from 'next/link';
import { PageHead, StageBadge } from '@/components/ui';
import { SERVICES, TIER_LABEL, serviceTitle } from '@/data/services';
import type { Tier } from '@/data/types';
import { priceLabel } from '@/lib/format';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: '서비스·가격',
  description: '내용증명·지급명령·고소장·소송 전부대리까지 전 상품의 정찰가와 표준 업무범위.',
  path: '/services',
});

const TIERS: { tier: Tier; desc: string }[] = [
  { tier: 'T1', desc: '정형화된 서면을 정찰가로. 변호사 검토·서명 후 제출·발송까지.' },
  { tier: 'T1R', desc: '직접 준비한 초안을 제출 전에 변호사가 검토·보완·서명.' },
  { tier: 'T2', desc: '업무범위를 사전 확정한 소송·수사 단계 대리. 성공보수율 사전 공개.' },
  { tier: 'T3', desc: '비정형·고액 사건은 법무법인 본체의 개별 상담으로.' },
];

export default function ServicesPage() {
  return (
    <>
      <PageHead
        eyebrow="Pricing"
        title="서비스·가격"
        lead="흥정 없는 정찰가입니다. 표시 가격은 부가세 별도이며, 인지대·송달료 등 실비는 결제 전 총액 화면에서 항목별로 보여드립니다."
      />
      {TIERS.map(({ tier, desc }) => {
        const items = SERVICES.filter((s) => s.tier === tier);
        return (
          <section key={tier} className="container section" style={{ paddingTop: 0 }}>
            <h2>{TIER_LABEL[tier]}</h2>
            <p className="sub" style={{ marginTop: -8, marginBottom: 14 }}>{desc}</p>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>상품</th><th>내용</th><th>처리 기간</th><th style={{ textAlign: 'right' }}>정찰가</th></tr>
                </thead>
                <tbody>
                  {items.map((s) => (
                    <tr key={s.slug}>
                      <td style={{ minWidth: 150 }}>
                        <Link href={`/services/${s.slug}`}><b>{serviceTitle(s)}</b></Link>
                        <div style={{ marginTop: 4 }}><StageBadge service={s} /></div>
                      </td>
                      <td>{s.summary}</td>
                      <td className="sub" style={{ minWidth: 140 }}>{s.turnaround}</td>
                      <td className="num">{priceLabel(s.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </>
  );
}

import Link from 'next/link';
import { BadgeCheck, Receipt, Route } from 'lucide-react';
import Reveal from '@/components/Reveal';
import ServicesBrowser from '@/components/ServicesBrowser';
import { PageHero, StageBadge, StatChips, TrustSeal } from '@/components/ui';
import { AREA_LABEL, SERVICES, trackOf } from '@/data/services';
import type { Area, Service, TrackKind } from '@/data/types';
import { priceText, won } from '@/lib/format';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: '서비스·가격',
  description: '민사·형사·자문 모든 상품의 직접 제출·변호사 명의 두 가지 가격과 업무범위.',
  path: '/services',
});

const PRINCIPLES = [
  { icon: Receipt, title: '정해진 가격', body: '표시된 가격이 수임료의 전부입니다. 부가세와 인지대·송달료 같은 실비는 결제 전에 항목별로 보여 드립니다.' },
  { icon: Route, title: '다음 단계 가격도 공개', body: '상대방이 이의하거나 불송치 결정이 나왔을 때 이어지는 절차의 가격과 업무범위도 미리 볼 수 있습니다.' },
  { icon: BadgeCheck, title: '수임하지 않으면 전액 환불', body: '담당 변호사가 검토한 뒤 정해진 서비스로 진행하기 어렵다고 판단하면 결제금액을 전부 돌려드립니다.' },
];

/** 전체 가격표 한 칸 — 그 방식이 있으면 가격, 없으면 "—". 구간·단계형은 첫 칸에 "○○원~" */
function cell(s: Service, kind: TrackKind) {
  if (s.tracks) {
    const t = trackOf(s, kind);
    return t ? `${won(t.amount)}${t.per ? `/${t.per}` : ''}` : '—';
  }
  return kind === 'self' ? '—' : priceText(s);
}

export default function ServicesPage() {
  const open = SERVICES.filter((s) => s.stage === 'pilot' && s.area !== 'consult').length;
  return (
    <>
      <PageHero
        crumbs={[{ label: '서비스·가격' }]}
        title="서비스·가격"
        lead="상품마다 두 가지 가격이 있습니다. 변호사가 검토한 서면을 본인 이름으로 직접 내거나, 변호사 명의로 제출과 이후 절차까지 맡길 수 있습니다. 가격은 따로 협의하지 않습니다."
        aside={
          <StatChips items={[
            { label: '지금 접수 가능', value: `${open}개 서비스` },
            { label: '전체 상품', value: `${SERVICES.filter((s) => s.area !== 'consult').length}종` },
            { label: '완성까지', value: '2~5영업일' },
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
              <span><b>전체 가격표</b> 모든 상품의 두 가지 가격과 처리 기간을 한 표로 봅니다</span>
            </summary>
            {(Object.keys(AREA_LABEL) as Exclude<Area, 'consult'>[]).map((area) => (
              <div key={area} className="price-tier">
                <h3>{AREA_LABEL[area]}</h3>
                <div className="table-wrap">
                  <table className="table price-table">
                    <thead><tr><th>상품</th><th>처리 기간</th><th style={{ textAlign: 'right' }}>내가 직접 제출</th><th style={{ textAlign: 'right' }}>변호사 명의</th></tr></thead>
                    <tbody>
                      {SERVICES.filter((s) => s.area === area).map((s) => (
                        <tr key={s.slug}>
                          <td><Link href={`/services/${s.slug}`}><b>{s.name}</b></Link>{s.unit && <span className="sub" style={{ display: 'block' }}>{s.unit}</span>}<div style={{ marginTop: 4 }}><StageBadge service={s} /></div></td>
                          <td className="sub">{s.turnaround ?? '—'}</td>
                          <td className="num">{cell(s, 'self')}</td>
                          <td className="num">{cell(s, 'atty')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            <p className="note">계약서 검토는 장수 구간별, 피의사건 정찰 변호는 단계별 가격입니다. 자세한 구간은 상품 페이지에서 확인하세요. 개별 상담이 필요한 사건은 견적을 따로 안내합니다.</p>
          </details>
        </div>
      </section>
    </>
  );
}

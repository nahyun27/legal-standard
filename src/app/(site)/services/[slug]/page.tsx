import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckList, Price, TierBadges } from '@/components/ui';
import { SERVICES, getService, serviceTitle } from '@/data/services';
import { priceLabel } from '@/lib/format';
import { pageMeta } from '@/lib/seo';
import { FIRM } from '@/lib/site';

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
  const open = s.stage === 'pilot';

  return (
    <div className="container section">
      <div className="detail">
        <div>
          <TierBadges service={s} />
          <h1>{serviceTitle(s)}</h1>
          <p className="lead">{s.summary}</p>

          <div className="grid grid-2" style={{ marginTop: 32 }}>
            <div className="card">
              <h3>포함 업무</h3>
              <CheckList items={s.includes} />
            </div>
            <div className="card">
              <h3>포함되지 않는 업무</h3>
              {s.excludes.length ? <CheckList items={s.excludes} negative /> : <p>—</p>}
            </div>
          </div>

          {nexts.length > 0 && (
            <section style={{ marginTop: 40 }}>
              <h2 style={{ fontSize: '1.4rem' }}>다음 단계와 가격</h2>
              <p className="sub" style={{ marginTop: -8, marginBottom: 14 }}>
                이 상품 이후 이어질 수 있는 절차의 가격을 미리 알려드립니다.
              </p>
              <div className="grid">
                {nexts.map((n) => (
                  <Link key={n.slug} href={`/services/${n.slug}`} className="card">
                    <div className="sub" style={{ color: 'var(--tag)', fontWeight: 700 }}>{n.when}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
                      <b>{serviceTitle(n.service)}</b>
                      <span className="price price-sm">{n.service.price.kind === 'tbd' ? '' : '+'}{priceLabel(n.service.price)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="card">
          <div className="sub">정찰가</div>
          <Price service={s} />
          <ul className="check" style={{ marginTop: 16, fontSize: 13.5 }}>
            <li>처리 기간: {s.turnaround}</li>
            {s.costs && <li>별도 실비: {s.costs.join(', ')}</li>}
            <li>수임 불성립 시 전액 반환</li>
          </ul>
          <div style={{ marginTop: 20 }}>
            {open ? (
              <Link href={`/intake/${s.slug}`} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                {s.tier === 'T3' ? '상담 요청' : '온라인 문진 시작'}
              </Link>
            ) : (
              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled>오픈 예정</button>
            )}
          </div>
          <p className="sub" style={{ marginTop: 12 }}>{FIRM.name} 소속 변호사가 검토·서명합니다.</p>
        </aside>
      </div>
    </div>
  );
}

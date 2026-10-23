import { notFound } from 'next/navigation';
import IntakeForm from '@/components/IntakeForm';
import { CheckList, Price } from '@/components/ui';
import { SERVICES, getService, serviceTitle } from '@/data/services';

export const metadata = { title: '온라인 문진', robots: { index: false, follow: false } };

export function generateStaticParams() {
  return SERVICES.filter((s) => s.stage === 'pilot').map((s) => ({ slug: s.slug }));
}

export default async function IntakePage({ params }: PageProps<'/intake/[slug]'>) {
  const s = getService((await params).slug);
  if (!s || s.stage !== 'pilot') notFound();

  return (
    <div className="container section">
      <div className="detail">
        <div>
          <span className="eyebrow">Intake</span>
          <h1>{serviceTitle(s)} 문진</h1>
          <p className="lead" style={{ marginBottom: 28 }}>
            입력하신 내용은 담당 변호사의 수임 검토에 쓰입니다. 표준 업무범위로 처리하기 어려운 사건이면 결제 전에 안내해 드립니다.
          </p>
          <IntakeForm service={s} />
        </div>
        <aside className="card">
          <div className="sub">{serviceTitle(s)}</div>
          <Price service={s} />
          <div style={{ marginTop: 16 }}><CheckList items={s.includes} /></div>
        </aside>
      </div>
    </div>
  );
}

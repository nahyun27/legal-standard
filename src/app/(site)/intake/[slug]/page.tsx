import { notFound } from 'next/navigation';
import IntakeForm from '@/components/IntakeForm';
import { PageHero } from '@/components/ui';
import { SERVICES, getService, serviceTitle } from '@/data/services';

export const metadata = { title: '온라인 문진', robots: { index: false, follow: false } };

export function generateStaticParams() {
  return SERVICES.filter((s) => s.stage === 'pilot').map((s) => ({ slug: s.slug }));
}

export default async function IntakePage({ params, searchParams }: PageProps<'/intake/[slug]'>) {
  const s = getService((await params).slug);
  const from = Number((await searchParams).from);
  if (!s || s.stage !== 'pilot') notFound();

  return (
    <>
      <PageHero
        crumbs={[{ label: '서비스·가격', href: '/services' }, { label: serviceTitle(s), href: `/services/${s.slug}` }, { label: '온라인 문진' }]}
        title={`${serviceTitle(s)} 문진`}
        lead="입력하신 내용은 담당 변호사의 수임 검토에 쓰입니다. 표준 업무범위로 처리하기 어려운 사건이면 결제 전에 안내해 드립니다."
      />
      <div className="container">
        <IntakeForm service={s} parentId={Number.isInteger(from) && from > 0 ? from : undefined} />
      </div>
    </>
  );
}

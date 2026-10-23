import CaseView from '@/components/CaseView';
import { NOINDEX } from '@/lib/seo';

export const metadata = { title: '사건 상세', robots: NOINDEX };

export default async function Page({ params, searchParams }: PageProps<'/my/cases/[id]'>) {
  const { id } = await params;
  const paid = (await searchParams).paid === '1';
  return <CaseView id={Number(id)} justPaid={paid} />;
}

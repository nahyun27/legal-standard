import AdminCaseDetail from '@/components/admin/AdminCaseDetail';

export const metadata = { title: '사건 상세' };

export default async function Page({ params }: PageProps<'/admin/cases/[id]'>) {
  return <AdminCaseDetail id={Number((await params).id)} />;
}

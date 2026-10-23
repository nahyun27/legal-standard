import AdminCases from '@/components/admin/AdminCases';

export const metadata = { title: '사건' };

export default async function Page({ searchParams }: PageProps<'/admin/cases'>) {
  const s = (await searchParams).status;
  return <AdminCases initialStatus={(Array.isArray(s) ? s[0] : s) ?? 'open'} />;
}

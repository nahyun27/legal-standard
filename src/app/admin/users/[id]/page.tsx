import AdminUserDetail from '@/components/admin/AdminUserDetail';

export const metadata = { title: '회원 상세' };

export default async function Page({ params }: PageProps<'/admin/users/[id]'>) {
  return <AdminUserDetail id={Number((await params).id)} />;
}

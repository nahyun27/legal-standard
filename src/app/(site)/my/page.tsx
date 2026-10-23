import MyAccount from '@/components/MyAccount';
import { NOINDEX } from '@/lib/seo';

export const metadata = { title: '내 사건', robots: NOINDEX };

export default function MyPage() {
  return <MyAccount />;
}

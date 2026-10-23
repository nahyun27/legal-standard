import { PageHead } from '@/components/ui';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({ title: '이용약관', description: '리걸스탠다드 이용약관', path: '/terms' });

// TODO: 법무법인 확정 문안으로 교체. 약관에는 서비스 운영 고지(/notice)의 자동화 도구 활용 고지와 수임 불성립 시 전액 반환 원칙을 포함한다.
export default function Page() {
  return (
    <>
      <PageHead title="이용약관" />
      <div className="container prose"><p className="sub">문안 준비 중입니다.</p></div>
    </>
  );
}

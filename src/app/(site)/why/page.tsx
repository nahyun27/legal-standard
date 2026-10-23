import { PageHead } from '@/components/ui';
import WhyPrice from '@/components/WhyPrice';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: '왜 이 가격인가',
  description: '정형적 사건의 표준화와 공정 설계 — 가격은 공정의 결과이고, 책임의 크기는 줄이지 않았습니다.',
  path: '/why',
});

export default function WhyPage() {
  return (
    <>
      <PageHead eyebrow="Why this price" title="어떻게 이 가격이 가능한가요" />
      <div className="container"><WhyPrice /></div>
    </>
  );
}

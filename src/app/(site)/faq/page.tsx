import { PageHead } from '@/components/ui';
import { FAQ } from '@/data/faq';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: '자주 묻는 질문',
  description: '가격, 추가 비용, 다음 단계, 서면 작성 방식, 진행 조회에 관한 안내.',
  path: '/faq',
});

export default function FaqPage() {
  return (
    <>
      <PageHead eyebrow="FAQ" title="자주 묻는 질문" />
      <div className="container prose">
        {FAQ.map((f) => (
          <details key={f.q} className="faq">
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </>
  );
}

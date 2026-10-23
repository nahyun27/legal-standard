import Link from 'next/link';
import FaqBrowser from '@/components/FaqBrowser';
import { PageHero } from '@/components/ui';
import { pageMeta } from '@/lib/seo';
import { FIRM } from '@/lib/site';

export const metadata = pageMeta({
  title: '자주 묻는 질문',
  description: '가격, 추가 비용, 다음 단계, 서면 작성 방식, 진행 조회에 관한 안내.',
  path: '/faq',
});

export default function FaqPage() {
  return (
    <>
      <PageHero crumbs={[{ label: '자주 묻는 질문' }]} title="자주 묻는 질문" lead="가격, 진행 방식, 서면을 누가 쓰는지, 개인정보에 관해 많이 받는 질문입니다." />
      <section className="band" style={{ paddingTop: 44 }}>
        <div className="container" style={{ maxWidth: 860 }}>
          <FaqBrowser />
          <div className="faq-more">
            <b>찾는 답이 없나요?</b>
            <p>대표전화 {FIRM.tel} · {FIRM.email} · {FIRM.hours}</p>
            <Link href="/notice" className="sub" style={{ textDecoration: 'underline' }}>서비스 운영 고지 보기</Link>
          </div>
        </div>
      </section>
    </>
  );
}

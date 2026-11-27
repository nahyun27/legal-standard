import Diagnosis from '@/components/Diagnosis';
import { PageHero } from '@/components/ui';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: '내 상황 확인',
  description: '겪은 일부터 고르면 살펴볼 절차와 필요한 서면, 준비서류, 관련 서비스의 가격을 안내합니다.',
  path: '/diagnosis',
});

export default function DiagnosisPage() {
  return (
    <>
      <PageHero
        crumbs={[{ label: '내 상황 확인' }]}
        title="고소할지, 소송할지 모르겠다면"
        lead="겪은 일부터 차근차근 골라 주세요. 민사·형사·가사·행정 중 어떤 절차를 살펴봐야 하는지, 어떤 서면과 자료가 필요한지 안내합니다. 2분쯤 걸립니다."
      />
      <section className="band" style={{ paddingTop: 32 }}>
        <div className="container"><Diagnosis /></div>
      </section>
    </>
  );
}

import { Check, Minus } from 'lucide-react';

/**
 * 홈 "혼자 쓸 때와 무엇이 다른가요" — 서면을 혼자 준비할 때 빠지기 쉬운 부분과 우리가 하는 일을 나란히 둔다.
 * 다른 법률사무소와의 비교가 아니라 "혼자 준비"와의 비교만 한다(광고 규정: 비교 광고 금지).
 * 오른쪽 칸은 실제 업무와 같아야 한다 — 검수 체크리스트(backend/app/core/catalog.py)에 있는 항목만 적는다.
 */
const ROWS = [
  { item: '내 사건에 맞는 서면', alone: '인터넷 서식을 찾아 내 사건에 맞게 고쳐야 합니다', ours: '문진에 답하면 내 사건 내용으로 서면을 만듭니다' },
  { item: '꼭 들어가야 할 내용', alone: '청구 근거나 고소 사실이 빠져도 알아채기 어렵습니다', ours: '담당 변호사가 상품별 체크리스트로 빠진 곳을 확인합니다' },
  { item: '법령·판례 인용', alone: '인용한 조문과 판례가 맞는지 직접 찾아봐야 합니다', ours: '실제로 있는지, 취지가 맞는지 변호사가 확인합니다' },
  { item: '관할·기한', alone: '어느 법원에, 언제까지 내야 하는지 직접 챙겨야 합니다', ours: '상품별로 관할 법원과 기간 제한을 확인합니다' },
  { item: '제출 뒤 법원 연락', alone: '보정 명령이 오면 혼자 해석하고 대응해야 합니다', ours: '「변호사에게 맡기기」를 고르면 변호사가 대응합니다' },
];

export default function AloneCompare() {
  return (
    <div className="alone-wrap">
      <table className="alone">
        <thead>
          <tr><th scope="col"><span className="sr-only">항목</span></th><th scope="col">혼자 준비할 때</th><th scope="col">리걸스탠다드</th></tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.item}>
              <th scope="row">{r.item}</th>
              <td><Minus size={15} aria-hidden="true" />{r.alone}</td>
              <td><Check size={15} aria-hidden="true" />{r.ours}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

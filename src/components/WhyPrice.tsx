import { COPY, COPY_TRACK } from '@/lib/copy';

// "왜 이 가격인가" — 프로토타입 4.1 의 공정표(.factory). B 는 "표준 공정", A 는 "AI" 행을 보여준다
// (B 에선 광고 영역 AI 언급 금지). 변호사 행은 강조(.hl).
const ROWS = [
  { who: '시스템', what: '구조화 문진으로 사실관계·증거를 수집하고 기한을 관리합니다' },
  { who: '표준 공정', what: '사건 유형별 표준 구조에 따라 서면의 뼈대를 구성합니다', track: 'B' },
  { who: 'AI', what: '등록 AI 시스템이 서면 초안과 판례 후보를 생성합니다 (결과물 검토변호사 성명 표시)', track: 'A' },
  { who: '변호사', what: '사실 부합성과 법리·인용을 검토·수정하고, 서명하고, 절차를 수행하며, 결과에 책임집니다', hl: true },
];

export default function WhyPrice() {
  const rows = ROWS.filter((r) => !r.track || r.track === COPY_TRACK);
  return (
    <div className="grid grid-2" style={{ gap: 48, marginTop: 40, alignItems: 'start' }}>
      <div className="why-body">
        {COPY.why.map((p) => <p key={p}>{p}</p>)}
      </div>
      <div className="factory" role="img" aria-label="역할 분담 안내">
        {rows.map((r) => (
          <div key={r.who} className={`frow${r.hl ? ' hl' : ''}`}>
            <div className="who">{r.who}</div>
            <div className="what">{r.what}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

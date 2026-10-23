import { COPY, COPY_TRACK } from '@/lib/copy';

// "이 가격이 가능한 이유"(소개 페이지·홈) — 프로토타입 4.1 의 공정표(.factory). B 는 "표준 공정", A 는 "AI" 행을 보여준다
// (B 에선 광고 영역 AI 언급 금지). 변호사 행은 강조(.hl).
const ROWS = [
  { who: '시스템', what: '정해진 질문으로 사실관계와 증거를 받고, 기한을 챙깁니다' },
  { who: '표준 공정', what: '사건 유형마다 정해 둔 틀에 맞춰 서면의 뼈대를 잡습니다', track: 'B' },
  { who: 'AI', what: '등록 AI 시스템이 서면 초안과 판례 후보를 생성합니다 (결과물 검토변호사 성명 표시)', track: 'A' },
  { who: '변호사', what: '사실관계와 법리, 인용이 맞는지 확인해 고치고 서명합니다. 제출과 이후 절차도 변호사가 맡습니다', hl: true },
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

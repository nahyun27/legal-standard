import { COPY } from '@/lib/copy';
import type { Category, Service } from './types';

/**
 * 상품·정찰가 (사업기획서 VII장 최종안, VAT 별도).
 * 가격 3원칙: ① 정찰제(흥정 없음, 여정 총비용까지 공개) ② 원가연동 ③ 염가 표방 금지.
 * "(확정 필요)" 표시는 기획서에 가격·범위가 아직 없는 항목 — 의뢰인 확정 후 채운다.
 */
export const SERVICES: Service[] = [
  // ── T1 서면 패키지 ────────────────────────────────────────────
  {
    slug: 'certified-letter',
    claimRequired: true,
    tier: 'T1',
    category: 'money',
    name: '내용증명 발송',
    summary: '대여금 독촉, 보증금 반환 요구, 계약 해지 통보 — 분쟁의 첫 단계.',
    price: { kind: 'fixed', amount: 55_000 },
    highlights: ['변호사 명의 발송', '표준 납기 2영업일', '1회 수정 포함'],
    includes: ['온라인 문진 기반 서면 작성', '변호사 검토·서명(법무법인 명의)', '우편 발송 대행', '1회 수정'],
    excludes: ['상대방과의 협상·통화 대행', '발송 이후 소송 절차'],
    costs: ['우체국 내용증명 발송 실비'],
    turnaround: '표준 납기 2영업일',
    next: [{ slug: 'payment-order', when: '기한 내 지급하지 않으면' }],
    stage: 'pilot',
  },
  {
    slug: 'payment-order',
    claimRequired: true,
    tier: 'T1',
    category: 'money',
    name: '지급명령 신청',
    summary: '차용증·거래내역이 있는 금전채권을 재판 없이 집행권원으로.',
    price: { kind: 'fixed', amount: 190_000 },
    tag: '단계별 비용 공개',
    highlights: ['전자소송 제출 포함', '표준 납기 3영업일', '이의 시 전환가 사전 공개'],
    includes: ['지급명령 신청서 작성', '변호사 검토·서명', '전자소송 제출', '보정명령 1회 대응'],
    excludes: ['채무자 이의 후 소송 수행(→ 소송 전환 상품)', '강제집행'],
    costs: ['인지대', '송달료'],
    turnaround: '표준 납기 3영업일 (전자소송 제출)',
    next: [
      { slug: 'small-claims', when: '채무자가 이의신청하면 소송으로 전환' },
      { slug: 'enforcement', when: '확정 후에도 지급하지 않으면' },
    ],
    stage: 'pilot',
  },
  {
    slug: 'complaint-basic',
    tier: 'T1',
    category: 'criminal',
    name: '형사 고소장',
    variant: '기본형',
    summary: '고소장 작성과 변호사 검토. 제출은 의뢰인이 직접.',
    price: { kind: 'fixed', amount: 219_000 },
    tag: '단계별 비용 공개',
    highlights: ['구성요건·증거목록 검토', '변호사 검토·서명', '불송치 이의신청 연계 · 납기 5영업일'],
    includes: ['고소장 작성', '구성요건·증거목록 검토', '변호사 검토·서명', '1회 수정', '제출 방법 안내'],
    excludes: ['수사기관 대리 제출', '조사 동석', '불송치 이의신청(→ 별도 상품)'],
    turnaround: '표준 납기 5영업일',
    next: [{ slug: 'objection', when: '불송치 결정이 나오면' }],
    stage: 'pilot',
  },
  {
    slug: 'complaint-standard',
    tier: 'T1',
    category: 'criminal',
    name: '형사 고소장',
    variant: '표준형',
    summary: '변호사 명의로 수사기관에 대리 제출. 불송치 이의신청까지 가격 연계.',
    price: { kind: 'fixed', amount: 290_000 },
    tag: '단계별 비용 공개',
    highlights: ['구성요건·증거목록 검토', '변호사 명의 대리 제출', '불송치 이의신청 연계 · 납기 5영업일'],
    includes: [
      '고소장 작성·구성요건·증거목록 검토',
      '변호사 검토·서명',
      '고소대리인 등록 및 관할 수사기관 대리 제출',
      '접수 확인',
      '수사기관 보완 요청 1회 대응',
    ],
    excludes: ['조사 동석', '2회차 이후 보완 대응', '피의자 측 합의 협상'],
    turnaround: '표준 납기 5영업일 (대리 제출)',
    next: [
      { slug: 'objection', when: '불송치 결정이 나오면' },
      { slug: 'retainer', when: '조사 동석 등 고소 후 대응이 필요하면' },
    ],
    stage: 'pilot',
  },
  {
    slug: 'objection',
    tier: 'T1',
    category: 'criminal',
    name: '불송치 이의신청서',
    summary: '경찰의 불송치 결정에 대한 이의신청. 고소장 상품과 가격이 미리 연결돼 있습니다.',
    price: { kind: 'fixed', amount: 165_000 },
    includes: ['불송치 결정서 분석', '이의신청서 작성', '변호사 검토·서명', '1회 수정'],
    excludes: ['검찰 단계 의견서', '재정신청'],
    turnaround: '표준 납기 3영업일',
    stage: 'launch',
  },
  {
    slug: 'civil-complaint',
    tier: 'T1',
    category: 'litigation',
    name: '소액소송 소장·답변서',
    summary: '소가 3,000만 원 이하 민사 분쟁의 소장 또는 답변서.',
    price: { kind: 'fixed', amount: 330_000 },
    highlights: ['요건사실·증거 정리 포함', '표준 납기 5영업일', '변호사 검수·서명'],
    includes: ['소장 또는 답변서 1건 작성', '변호사 검토·서명', '전자소송 제출 안내', '1회 수정'],
    excludes: ['준비서면', '기일 출석'],
    costs: ['인지대', '송달료'],
    turnaround: '표준 납기 5영업일',
    next: [{ slug: 'small-claims', when: '변론까지 맡기려면' }],
    stage: 'launch',
  },
  {
    slug: 'deposit-return',
    tier: 'T1',
    category: 'lease',
    name: '보증금 반환 내용증명',
    summary: '계약 만료 후 돌려받지 못한 임대차 보증금 — 임차권등기·지급명령까지 이어집니다.',
    price: { kind: 'fixed', amount: 55_000 },
    includes: ['임대차 계약 검토', '내용증명 작성', '변호사 검토·서명', '우편 발송 대행'],
    excludes: ['임차권등기명령 신청(확정 필요)', '소송 수행'],
    costs: ['우체국 내용증명 발송 실비'],
    turnaround: '표준 납기 2영업일',
    next: [
      { slug: 'payment-order', when: '기한 내 반환하지 않으면' },
      { slug: 'small-claims', when: '다툼이 있어 소송이 필요하면' },
    ],
    stage: 'launch',
  },
  {
    slug: 'enforcement',
    tier: 'T1',
    category: 'money',
    name: '강제집행 (압류·추심)',
    summary: '판결·지급명령을 받았는데도 지급하지 않을 때 — 채권 압류·추심, 재산명시.',
    price: { kind: 'tbd' },
    includes: ['채권 압류 및 추심명령 신청', '변호사 검토·서명', '전자소송 제출'],
    excludes: ['부동산 경매', '재산조회 이후 추가 신청'],
    costs: ['인지대', '송달료'],
    turnaround: '표준 납기 3영업일',
    stage: 'launch',
  },

  // ── T1 신설: 초안 검토·보완 ──────────────────────────────────
  {
    slug: 'draft-review',
    tier: 'T1R',
    category: 'review',
    name: COPY.draftReviewName,
    summary: COPY.draftReviewSummary,
    price: { kind: 'from', amount: 110_000 },
    // 프로토타입 태그는 "시장 유일"이지만 변협 광고규정의 최상급·비교 표현 금지와 충돌 소지가 있어 바꿨다(의뢰인 확인 필요)
    tag: '새 서비스',
    includes: ['인용 법령·판례 검증', '요건사실 누락 점검', '보완본 + 변호사 의견', '변호사 서명'],
    excludes: ['새로 작성하는 수준의 전면 재작성(→ 해당 서면 상품으로 안내)'],
    turnaround: '표준 납기 2영업일',
    stage: 'pilot',
  },

  // ── T2 표준 수임 ─────────────────────────────────────────────
  {
    slug: 'small-claims',
    tier: 'T2',
    category: 'litigation',
    name: '소액사건 표준 수임',
    summary: '접수부터 판결까지, 정해진 업무범위의 소송 전부 대리. 이의 후 소송 전환 포함.',
    price: { kind: 'range', min: 1_100_000, max: 2_200_000 },
    tag: '전부 맡기기',
    highlights: ['표준 업무범위 사전 확정', '성공보수 정률 공개', '담당변호사 직접 수행'],
    includes: ['소장·준비서면 작성', '변론기일 출석', '1심 판결까지 수행'],
    excludes: ['항소심', '강제집행(→ 별도 상품)'],
    costs: ['인지대', '송달료', '감정료 등 소송비용'],
    turnaround: '수임 검토 24시간 이내 회신',
    next: [{ slug: 'enforcement', when: '판결 후에도 지급하지 않으면' }],
    stage: 'launch',
  },
  {
    slug: 'retainer',
    tier: 'T2',
    category: 'criminal',
    name: '고소 후 대응',
    summary: '고소 이후 조사 동석, 의견서 제출 등 수사 단계 대응. 업무범위 사전 확정.',
    price: { kind: 'range', min: 1_100_000, max: 2_200_000 },
    includes: ['고소인 조사 동석(확정 필요: 횟수)', '수사기관 의견서', '진행 상황 보고'],
    excludes: ['재판 단계', '민사 손해배상 소송'],
    turnaround: '수임 검토 24시간 이내 회신',
    stage: 'launch',
  },

  // ── T3 심화 연계 ─────────────────────────────────────────────
  {
    slug: 'advanced',
    tier: 'T3',
    category: 'litigation',
    name: '심화 사건 연계',
    summary: '정형화되지 않은 사건, 고액 사건은 처음부터 법무법인 본체에서 맡습니다.',
    price: { kind: 'quote' },
    includes: ['담당 변호사 배정 상담', '사건별 견적'],
    excludes: [],
    turnaround: '접수 후 영업일 기준 1일 이내 연락',
    stage: 'pilot',
  },
];

export const CATEGORY_LABEL: Record<Category, string> = {
  money: '돈을 받아야 할 때',
  criminal: '형사 고소',
  lease: '임대차 분쟁',
  review: '초안 검토',
  litigation: '소송',
};

export const TIER_LABEL = {
  T1: '서면 패키지',
  T1R: '초안 검토·보완',
  T2: '표준 수임',
  T3: '심화 연계',
} as const;

export const STAGE_LABEL = {
  pilot: '베타 운영 중',
  launch: '2027년 2월 오픈 예정',
  later: '준비 중',
} as const;

export function getService(slug: string) {
  return SERVICES.find((s) => s.slug === slug);
}

export function serviceTitle(s: Service) {
  return s.variant ? `${s.name} ${s.variant}` : s.name;
}

/** 상품 상세 "준비하면 좋은 자료" — 상황별 공통. 문진 문항(intakeQuestions)과 함께 검수 시간을 줄인다. */
export const PREP_BY_CATEGORY: Record<Category, string[]> = {
  money: ['차용증·계약서·거래명세서', '계좌이체 내역 또는 영수증', '갚으라고 요구한 문자·카카오톡 대화', '상대방 주소와 연락처'],
  criminal: ['피해 사실이 드러나는 대화·게시물 캡처', '송금 내역(재산 피해인 경우)', '진단서·사진(신체 피해인 경우)', '상대방에 대해 아는 정보(이름·연락처·계좌·아이디)'],
  lease: ['임대차계약서', '보증금을 보낸 이체 내역', '확정일자·전입신고 확인 자료', '집주인과 주고받은 연락'],
  review: ['검토받을 초안 파일', '초안에 인용한 증거', '상대방이 낸 서면(받은 경우)'],
  litigation: ['법원·상대방에게서 받은 서류', '계약서·증거 자료', '지금까지의 진행 경과 메모'],
};

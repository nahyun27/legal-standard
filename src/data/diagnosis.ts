/**
 * 내 상황 확인(/diagnosis) — 겪은 일부터 고르면 질문이 갈라지고, 마지막에 살펴볼 절차·서면·상품을 안내한다.
 *
 * 구조: 질문(DxQuestion)의 선택지가 다음 질문(next) 또는 결과(result)로 이어진다. 선택지의 fact 는 결과 화면의
 * "고른 내용으로 본 이유"에 그대로 쓰이고, tag 는 결과에 덧붙는 절차(extras)를 켠다(예: 속인 자료가 있으면 고소장 추가).
 *
 * 광고 영역이다 — 결과를 약속하거나 단정하는 표현, BANNED_AD_WORDS 를 쓰지 않는다. 법률 판단이 아니라
 * "어떤 절차를 살펴볼지" 안내이고, 최종 판단은 접수 뒤 변호사가 자료를 보고 한다. 기한 문구는 법 조문 기준이며
 * 문항·결과 문구 전체는 담당 변호사 검토 후 확정할 것(초안).
 */
import type { Area } from './types';

export interface DxOption {
  label: string;
  hint?: string;
  next?: string;   // 다음 질문 id
  result?: string; // 결과 id(둘 중 하나)
  fact?: string;   // 결과 화면 "고른 내용"에 쓰는 문장
  tag?: string;    // 결과의 extras 를 켠다
}

export interface DxQuestion {
  id: string;
  title: string;
  hint?: string;
  options: DxOption[];
}

export interface DxProcedure {
  area: Exclude<Area, 'consult'> | 'consult';
  title: string;   // 절차 이름
  what: string;    // 무엇을 구하는 절차인지
  doc: string;     // 필요한 서면
  where: string;   // 어디에 내는지
  caution?: string;
}

export interface DxResult {
  id: string;
  headline: string;
  lead: string;
  deadline?: string;           // 기한 경고(있으면 맨 위에 강조)
  procedures: DxProcedure[];
  todo: string[];              // 지금 할 일
  services: string[];          // 추천 상품 slug(첫 번째가 주 상품 — 준비서류 체크 기준)
  related?: string[];          // 함께 살펴볼 상품 slug
  extras?: { tag: string; procedure: DxProcedure; service: string }[];
}

export const DX_START = 'start';

// ---- 질문 ---------------------------------------------------------------

export const DX_QUESTIONS: Record<string, DxQuestion> = {
  start: {
    id: 'start',
    title: '어떤 일을 겪고 계신가요?',
    hint: '법률 용어나 서류 이름을 몰라도 됩니다. 지금 상황과 가장 가까운 것을 골라 주세요.',
    options: [
      { label: '받아야 할 돈을 받지 못했어요', next: 'money_cause' },
      { label: '사기·폭행·명예훼손 같은 피해를 입었어요', next: 'crime_goal' },
      { label: '전세·월세 보증금을 돌려받지 못했어요', next: 'lease_move', fact: '임대차 보증금을 돌려받지 못했습니다.' },
      { label: '경찰·검찰·법원에서 서류를 받았어요', next: 'paper_kind' },
      { label: '판결이나 지급명령을 받았는데 돈을 못 받았어요', result: 'enforce', fact: '이미 판결이나 확정된 지급명령이 있습니다.' },
      { label: '상속·이혼·후견·개명 같은 가족 일이에요', next: 'family_kind' },
      { label: '운전면허 처분이나 학교폭력 통지를 받았어요', next: 'admin_kind' },
      { label: '계약서 검토나 회사 일로 자문이 필요해요', next: 'advisory_kind' },
      { label: '다른 일이거나, 어떻게 설명할지 모르겠어요', result: 'unsure' },
    ],
  },

  // 돈
  money_cause: {
    id: 'money_cause',
    title: '어떤 돈인가요?',
    hint: '계약서 제목보다 실제로 어떤 약속을 했는지가 중요합니다.',
    options: [
      { label: '빌려준 돈', next: 'money_deceive', fact: '빌려준 돈(대여금)을 받으려고 합니다.' },
      { label: '물건값이나 용역·공사 대금', next: 'money_deceive', fact: '물건값이나 용역·공사 대금을 받으려고 합니다.' },
      { label: '일하고 받지 못한 임금·퇴직금', result: 'wage', fact: '받지 못한 임금·퇴직금이 있습니다.' },
      { label: '투자금·환불금 등 다른 돈', next: 'money_deceive', fact: '투자금·환불금 등 약속한 돈을 받으려고 합니다.' },
    ],
  },
  money_deceive: {
    id: 'money_deceive',
    title: '돈을 주기 전에 상대방이 사실과 다르게 설명했다는 자료가 있나요?',
    hint: '갚지 않았다는 사실만으로 사기가 되지는 않습니다. 처음부터 속였다는 자료가 있을 때 형사 고소를 함께 살펴봅니다.',
    options: [
      { label: '있어요(거짓 설명이 담긴 대화, 존재하지 않는 담보 등)', next: 'money_court', tag: 'deceive', fact: '돈을 주기 전 설명이 사실과 달랐다는 자료가 있습니다.' },
      { label: '없어요. 약속을 안 지키고 연락을 피할 뿐이에요', next: 'money_court' },
      { label: '잘 모르겠어요', next: 'money_court' },
    ],
  },
  money_court: {
    id: 'money_court',
    title: '같은 돈으로 이미 법원에서 진행한 일이 있나요?',
    hint: '이미 받은 판결이나 진행 중인 재판이 있으면 새로 청구하기보다 그 절차를 먼저 확인합니다.',
    options: [
      { label: '아직 없어요', next: 'money_dispute' },
      { label: '판결·지급명령을 받았어요', result: 'enforce', fact: '같은 돈에 대해 판결이나 지급명령을 이미 받았습니다.' },
      { label: '상대방이 소송을 걸었거나 재판이 진행 중이에요', result: 'defense_civil', fact: '같은 돈을 두고 재판이 진행 중입니다.' },
    ],
  },
  money_dispute: {
    id: 'money_dispute',
    title: '상대방이 돈을 줄 의무나 금액을 다투나요?',
    options: [
      { label: '다투지 않아요(인정하거나 연락만 피해요)', next: 'money_address', fact: '상대방이 돈을 줄 의무나 금액을 크게 다투지 않습니다.' },
      { label: '줄 돈이 없다거나 금액이 다르다고 다퉈요', next: 'money_amount', fact: '상대방이 돈을 줄 의무나 금액을 다툽니다.' },
    ],
  },
  money_amount: {
    id: 'money_amount',
    title: '받을 금액이 얼마인가요?',
    options: [
      { label: '3,000만 원 이하', result: 'money_suit', fact: '청구 금액이 3,000만 원 이하입니다.' },
      { label: '3,000만 원 초과', result: 'money_big', fact: '청구 금액이 3,000만 원을 넘습니다.' },
    ],
  },
  money_address: {
    id: 'money_address',
    title: '상대방이 서류를 받을 국내 주소를 아시나요?',
    hint: '지급명령은 상대방에게 서류가 전달되어야 진행됩니다.',
    options: [
      { label: '알아요', next: 'money_assets', fact: '상대방의 국내 주소를 알고 있습니다.' },
      { label: '몰라요', result: 'money_noaddr', fact: '상대방의 주소를 모릅니다.' },
    ],
  },
  money_assets: {
    id: 'money_assets',
    title: '상대방이 재산을 팔거나 빼돌릴 것 같은 사정이 있나요?',
    hint: '예: 집을 내놓았다, 예금을 옮기겠다고 말했다, 다른 빚 독촉을 받고 있다.',
    options: [
      { label: '그런 사정이 있어요', result: 'money_attach', fact: '상대방이 재산을 처분할 우려가 있습니다.' },
      { label: '특별히 없어요', next: 'money_demanded' },
    ],
  },
  money_demanded: {
    id: 'money_demanded',
    title: '지금까지 갚으라고 정식으로 요구해 봤나요?',
    options: [
      { label: '아직 문자·전화로만 말했어요', result: 'money_letter', fact: '아직 정식으로 지급을 요구한 적이 없습니다.' },
      { label: '여러 번 요구했는데 주지 않아요', result: 'money_order', fact: '여러 번 요구했지만 돈을 받지 못했습니다.' },
    ],
  },

  // 형사 피해
  crime_goal: {
    id: 'crime_goal',
    title: '이 일에서 가장 원하는 것은 무엇인가요?',
    options: [
      { label: '상대방의 처벌을 구하고 싶어요', next: 'crime_stage', fact: '상대방의 처벌을 구하려고 합니다.' },
      { label: '잃은 돈을 돌려받고 싶어요', next: 'money_deceive', fact: '피해로 잃은 돈을 돌려받으려고 합니다.' },
      { label: '처벌도 구하고 돈도 돌려받고 싶어요', next: 'crime_stage', tag: 'money', fact: '처벌과 피해 회복을 함께 구하려고 합니다.' },
    ],
  },
  crime_stage: {
    id: 'crime_stage',
    title: '지금 어느 단계인가요?',
    options: [
      { label: '아직 신고·고소 전이에요', next: 'crime_who' },
      { label: '경찰이 수사하고 있어요', result: 'crime_investigating', fact: '수사기관이 사건을 수사하고 있습니다.' },
      { label: '불송치·불기소 통지를 받았어요', result: 'crime_objection', fact: '불송치 결정이나 불기소 처분 통지를 받았습니다.' },
      { label: '가해자의 형사재판이 열렸어요', result: 'crime_trial', fact: '가해자에 대한 형사재판이 진행 중입니다.' },
      { label: '형사조정에 나오라는 안내를 받았어요', result: 'crime_mediation', fact: '형사조정 안내를 받았습니다.' },
    ],
  },
  crime_who: {
    id: 'crime_who',
    title: '상대방을 특정할 수 있는 정보가 있나요?',
    hint: '이름을 몰라도 고소할 수 있습니다. 그때는 "성명불상"으로 적고 아래 같은 단서를 씁니다.',
    options: [
      { label: '이름과 연락처를 알아요', result: 'crime_complaint', fact: '상대방의 이름과 연락처를 알고 있습니다.' },
      { label: '이름은 모르지만 아이디·전화번호·계좌번호가 있어요', result: 'crime_complaint', fact: '상대방 이름은 모르지만 아이디·전화번호·계좌번호 같은 단서가 있습니다.' },
      { label: '단서가 거의 없어요', result: 'crime_complaint', tag: 'noclue', fact: '상대방을 특정할 단서가 거의 없습니다.' },
    ],
  },

  // 보증금
  lease_move: {
    id: 'lease_move',
    title: '이사 계획이 있나요?',
    hint: '보증금을 받기 전에 이사하면 대항력과 우선변제권을 잃을 수 있습니다.',
    options: [
      { label: '곧 이사해야 하거나 이미 이사했어요', result: 'lease_registration', fact: '보증금을 받기 전에 이사해야 합니다.' },
      { label: '아직 살고 있어요', result: 'lease_letter', fact: '아직 그 집에 살고 있습니다.' },
    ],
  },

  // 받은 서류
  paper_kind: {
    id: 'paper_kind',
    title: '어떤 서류를 받았나요?',
    hint: '서류 맨 위의 제목과 나를 부르는 표현(피의자·피해자·피고 등)을 확인해 주세요.',
    options: [
      { label: '경찰·검찰 출석요구(피의자로 불렀어요)', next: 'defense_admit', fact: '수사기관에서 피의자로 출석요구를 받았습니다.' },
      { label: '경찰·검찰 출석요구(피해자·참고인으로 불렀어요)', result: 'crime_investigating', fact: '피해자·참고인으로 출석요구를 받았습니다.' },
      { label: '불송치·불기소 결과 통지', result: 'crime_objection', fact: '불송치 결정이나 불기소 처분 통지를 받았습니다.' },
      { label: '법원에서 온 소장이나 지급명령', result: 'defense_civil', fact: '법원에서 소장이나 지급명령을 받았습니다.' },
      { label: '서류 이름을 모르겠어요', result: 'unsure' },
    ],
  },
  defense_admit: {
    id: 'defense_admit',
    title: '수사받는 사실관계를 인정하나요?',
    hint: '예: 음주운전 수치, 폭행 사실 자체는 인정하고 선처를 구하는 경우',
    options: [
      { label: '인정하고 선처를 구하고 싶어요', result: 'defense', fact: '사실관계를 인정하고 선처를 구하려고 합니다.' },
      { label: '사실이 아니거나 다투고 싶어요', result: 'defense_dispute', fact: '수사받는 사실관계를 다투려고 합니다.' },
    ],
  },

  // 가족
  family_kind: {
    id: 'family_kind',
    title: '어떤 가족 일인가요?',
    options: [
      { label: '돌아가신 분의 재산이나 빚을 물려받는 일', next: 'inherit_debt' },
      { label: '이혼', next: 'divorce_agree' },
      { label: '배우자의 부정행위 상대방에게 위자료를 청구하거나, 청구를 받았어요', result: 'paramour', fact: '배우자의 부정행위와 관련한 위자료 문제가 있습니다.' },
      { label: '정해진 양육비를 받지 못하고 있어요', result: 'child_support', fact: '정해진 양육비를 받지 못하고 있습니다.' },
      { label: '치매·장애가 있는 가족의 재산 관리', result: 'guardianship', fact: '스스로 재산을 관리하기 어려운 가족이 있습니다.' },
      { label: '이름을 바꾸고 싶어요', result: 'name_change', fact: '개명을 하려고 합니다.' },
    ],
  },
  inherit_debt: {
    id: 'inherit_debt',
    title: '돌아가신 분의 빚이 재산보다 많을 수 있나요?',
    options: [
      { label: '빚이 더 많거나, 얼마인지 몰라요', result: 'inherit_renounce', fact: '물려받을 빚이 재산보다 많거나 규모를 모릅니다.' },
      { label: '아니요. 재산을 나눠야 해요', result: 'inherit_division', fact: '상속인끼리 재산을 나눠야 합니다.' },
    ],
  },
  divorce_agree: {
    id: 'divorce_agree',
    title: '이혼과 조건(재산·양육)에 대해 배우자와 합의가 되었나요?',
    options: [
      { label: '이혼과 조건 모두 합의했어요', result: 'divorce_agreement', fact: '이혼과 조건에 모두 합의했습니다.' },
      { label: '대체로 합의했지만 일부 조건이 남았어요', result: 'divorce_mediation', fact: '이혼에는 뜻이 모였고 일부 조건이 남았습니다.' },
      { label: '합의가 되지 않아요', result: 'divorce_suit', fact: '이혼이나 조건에 합의가 되지 않습니다.' },
    ],
  },

  // 행정
  admin_kind: {
    id: 'admin_kind',
    title: '어떤 통지를 받았나요?',
    options: [
      { label: '운전면허 취소·정지 처분', result: 'license', fact: '운전면허 취소·정지 처분 통지를 받았습니다.' },
      { label: '학교폭력 심의위원회 개최 통지나 조치 결정', result: 'school', fact: '학교폭력 심의 개최 통지나 조치 결정을 받았습니다.' },
    ],
  },

  // 자문
  advisory_kind: {
    id: 'advisory_kind',
    title: '어떤 자문이 필요하세요?',
    options: [
      { label: '계약서에 서명하기 전에 검토받고 싶어요', result: 'contract', fact: '서명 전 계약서 검토가 필요합니다.' },
      { label: '해고·징계·임금 같은 노무 문제예요', result: 'labor', fact: '회사의 노무·인사 문제가 있습니다.' },
      { label: '행정기관 조사나 언론 보도에 대응해야 해요', result: 'agency', fact: '기관 조사나 언론 보도 대응이 필요합니다.' },
    ],
  },
};

// ---- 결과 ---------------------------------------------------------------

const COMPLAINT_EXTRA = {
  tag: 'deceive',
  service: 'complaint',
  procedure: {
    area: 'criminal' as const,
    title: '형사 고소',
    what: '처음부터 속여 돈을 받았는지 수사기관의 판단을 구합니다.',
    doc: '고소장',
    where: '경찰서 등 수사기관',
    caution: '형사 절차는 처벌 여부를 정하는 절차이고, 그 자체로 돈을 돌려주지는 않습니다. 돈은 민사 절차로 따로 청구합니다.',
  },
};

const RESTITUTION_EXTRA = {
  tag: 'money',
  service: 'restitution',
  procedure: {
    area: 'criminal' as const,
    title: '배상명령 신청',
    what: '가해자의 형사재판에서 피해 배상을 함께 명해 달라고 신청합니다.',
    doc: '배상명령신청서',
    where: '형사재판을 맡은 법원',
    caution: '재판이 열린 뒤 1심 또는 2심 변론이 끝나기 전까지 신청할 수 있습니다.',
  },
};

export const DX_RESULTS: Record<string, DxResult> = {
  money_letter: {
    id: 'money_letter',
    headline: '내용증명으로 정식 요구부터 시작할 수 있어요.',
    lead: '정식으로 요구한 기록을 남기면 상대방이 응하는 경우도 있고, 응하지 않으면 그 기록을 다음 절차에 씁니다.',
    procedures: [
      { area: 'civil', title: '내용증명 발송', what: '받을 돈과 지급 기한을 적어 공식적으로 요구합니다.', doc: '내용증명', where: '상대방 주소로 우편 발송' },
      { area: 'civil', title: '지급명령 신청(기한이 지나면)', what: '재판 없이 돈을 지급하라는 법원의 명령을 구합니다.', doc: '지급명령신청서', where: '상대방 주소지 관할 법원', caution: '상대방이 이의하면 소송으로 이어집니다.' },
    ],
    todo: ['차용증·계약서와 이체 내역을 모아 주세요.', '상대방의 이름과 주소를 확인해 주세요.', '언제까지 갚으라고 할지 정해 주세요.'],
    services: ['certified-letter', 'payment-order'],
    extras: [COMPLAINT_EXTRA],
  },
  money_order: {
    id: 'money_order',
    headline: '지급명령으로 법원의 명령을 구할 수 있어요.',
    lead: '상대방이 돈을 줄 의무를 크게 다투지 않고 주소를 알고 있다면, 재판 없이 서면으로 진행하는 지급명령이 맞을 수 있습니다.',
    procedures: [
      { area: 'civil', title: '지급명령 신청', what: '돈을 지급하라는 법원의 명령을 구합니다.', doc: '지급명령신청서', where: '상대방 주소지 관할 법원', caution: '상대방이 명령을 받고 2주 안에 이의하면 소송으로 이어집니다.' },
    ],
    todo: ['차용증·계약서와 이체 내역을 모아 주세요.', '상대방의 이름과 주소를 확인해 주세요.', '일부라도 받은 돈이 있으면 날짜와 금액을 적어 두세요.'],
    services: ['payment-order'],
    related: ['small-claims'],
    extras: [COMPLAINT_EXTRA],
  },
  money_attach: {
    id: 'money_attach',
    headline: '먼저 재산을 묶어 두는 가압류를 살펴보세요.',
    lead: '청구 절차가 끝나기 전에 상대방이 재산을 처분하면 이긴 뒤에도 받기 어려워질 수 있습니다. 가압류는 재산을 처분하지 못하게 미리 묶어 두는 절차입니다.',
    procedures: [
      { area: 'civil', title: '가압류 신청', what: '상대방의 부동산이나 예금·채권을 처분하지 못하게 묶어 둡니다.', doc: '가압류신청서', where: '관할 법원', caution: '법원이 정하는 담보(공탁금이나 보증보험)가 필요할 수 있습니다.' },
      { area: 'civil', title: '지급명령 또는 소송', what: '받을 돈을 확정합니다.', doc: '지급명령신청서 또는 소장', where: '관할 법원' },
    ],
    todo: ['상대방 재산에 대해 아는 것(부동산 주소, 거래 은행, 직장)을 적어 주세요.', '차용증·계약서와 이체 내역을 모아 주세요.'],
    services: ['provisional-attachment', 'payment-order'],
    extras: [COMPLAINT_EXTRA],
  },
  money_noaddr: {
    id: 'money_noaddr',
    headline: '주소를 모르면 소송에서 주소를 찾는 절차부터 살펴봐요.',
    lead: '지급명령은 상대방에게 서류가 전달되어야 하므로 주소를 모르면 진행하기 어렵습니다. 소송에서는 전화번호나 계좌번호로 법원에 주소를 확인해 달라고 신청하는 방법을 검토할 수 있습니다.',
    procedures: [
      { area: 'civil', title: '소액재판(소송)', what: '판결로 받을 돈을 확정합니다.', doc: '소장', where: '관할 법원', caution: '주소를 찾지 못하면 공시송달 같은 절차를 함께 검토합니다.' },
    ],
    todo: ['상대방의 전화번호·계좌번호·예전 주소처럼 아는 정보를 모두 적어 주세요.', '차용증·계약서와 이체 내역을 모아 주세요.'],
    services: ['small-claims'],
    related: ['advanced'],
    extras: [COMPLAINT_EXTRA],
  },
  money_suit: {
    id: 'money_suit',
    headline: '다툼이 있으면 소액재판으로 판단을 받는 편이 맞을 수 있어요.',
    lead: '상대방이 다툴 것이 분명하면 지급명령을 내도 이의로 소송이 될 가능성이 큽니다. 3,000만 원 이하라면 소액재판 절차를 살펴보세요.',
    procedures: [
      { area: 'civil', title: '소액재판', what: '판결로 받을 돈을 확정합니다.', doc: '소장', where: '관할 법원', caution: '변론기일에 출석이 필요할 수 있습니다.' },
    ],
    todo: ['상대방이 무엇을 다투는지(금액, 갚았다는 주장 등) 정리해 주세요.', '그 주장을 반박할 자료를 모아 주세요.'],
    services: ['small-claims'],
    related: ['provisional-attachment'],
    extras: [COMPLAINT_EXTRA],
  },
  money_big: {
    id: 'money_big',
    headline: '금액이 크고 다툼이 있으면 변호사와 개별 상담이 맞아요.',
    lead: '3,000만 원을 넘고 상대방이 다투는 사건은 정해진 상품 범위로 처리하기 어렵습니다. 변호사가 자료를 보고 절차와 비용을 개별로 안내합니다.',
    procedures: [
      { area: 'consult', title: '민사 소송', what: '판결로 받을 돈을 확정합니다.', doc: '소장', where: '관할 법원' },
    ],
    todo: ['계약서·이체 내역·주고받은 대화를 모아 주세요.', '상대방이 무엇을 다투는지 정리해 주세요.'],
    services: ['advanced'],
    related: ['provisional-attachment'],
    extras: [COMPLAINT_EXTRA],
  },
  enforce: {
    id: 'enforce',
    headline: '판결을 받고도 주지 않으면 강제집행 절차로 넘어가요.',
    lead: '판결이나 확정된 지급명령이 있으면 상대방의 예금·급여를 압류하거나, 재산을 찾는 절차를 쓸 수 있습니다.',
    procedures: [
      { area: 'civil', title: '채권 압류 및 추심', what: '상대방의 예금이나 급여에서 받을 돈을 받아 냅니다.', doc: '채권압류 및 추심명령 신청서', where: '관할 법원', caution: '어느 은행·직장에 재산이 있는지 알아야 효과가 있습니다.' },
      { area: 'civil', title: '재산명시·재산조회', what: '재산을 모를 때 법원을 통해 상대방 재산을 확인합니다.', doc: '재산명시 신청서·재산조회 신청서', where: '관할 법원' },
    ],
    todo: ['판결문이나 지급명령 정본과 확정증명원을 준비해 주세요.', '상대방의 거래 은행·직장처럼 아는 재산 정보를 적어 주세요.'],
    services: ['seizure', 'asset-disclosure', 'asset-inquiry'],
    related: ['debtor-registry'],
  },
  defense_civil: {
    id: 'defense_civil',
    headline: '받은 서류에 맞춰 답변하는 기한이 정해져 있어요.',
    lead: '법원에서 온 서류는 내버려 두면 상대방 주장대로 정해질 수 있습니다. 서류 종류와 받은 날짜부터 확인해 주세요.',
    deadline: '지급명령은 받은 날부터 2주 안에 이의신청을, 소장은 받은 날부터 30일 안에 답변서를 내야 합니다.',
    procedures: [
      { area: 'civil', title: '지급명령 이의신청 또는 답변서', what: '상대방 청구에 대한 내 입장을 법원에 냅니다.', doc: '이의신청서 · 답변서 · 준비서면', where: '서류를 보낸 법원' },
    ],
    todo: ['서류를 받은 날짜를 확인해 주세요(봉투나 송달 안내 문자).', '받은 서류 전체를 사진이나 파일로 준비해 주세요.', '상대방 주장 중 사실과 다른 부분을 적어 주세요.'],
    services: ['answer-brief'],
    related: ['advanced'],
  },
  wage: {
    id: 'wage',
    headline: '임금·퇴직금은 노동청 진정을 먼저 살펴보세요.',
    lead: '받지 못한 임금과 퇴직금은 고용노동부(지방노동관서)에 진정하는 방법이 있습니다. 진정 뒤에도 해결되지 않으면 민사 절차를 검토합니다.',
    procedures: [
      { area: 'consult', title: '임금체불 진정', what: '근로감독관이 체불 여부를 조사합니다.', doc: '진정서', where: '사업장 관할 지방고용노동관서' },
      { area: 'civil', title: '지급명령·소송', what: '체불 임금의 지급을 법원에 구합니다.', doc: '지급명령신청서 또는 소장', where: '관할 법원' },
    ],
    todo: ['근로계약서와 급여 이체 내역을 모아 주세요.', '일한 기간과 받지 못한 금액을 정리해 주세요.'],
    services: ['advanced'],
    related: ['payment-order'],
  },
  crime_complaint: {
    id: 'crime_complaint',
    headline: '고소장으로 수사를 요청할 수 있어요.',
    lead: '고소장에는 언제, 누가, 무엇을 했는지와 그것이 어떤 죄에 해당하는지를 증거와 함께 적습니다. 억울한 일과 처벌 대상인 행위는 다를 수 있어 사실관계부터 정리합니다.',
    procedures: [
      { area: 'criminal', title: '형사 고소', what: '피해 사실을 알리고 수사와 처벌을 요청합니다.', doc: '고소장', where: '경찰서 등 수사기관', caution: '상대방 이름을 몰라도 "성명불상"으로 고소할 수 있지만, 아이디·전화번호·계좌번호 같은 단서가 있어야 수사로 특정할 수 있습니다.' },
    ],
    todo: ['피해가 드러나는 대화·게시물을 캡처해 두세요(날짜가 보이게).', '송금 내역이나 진단서처럼 피해를 보여 주는 자료를 모아 주세요.', '상대방에 대해 아는 정보(아이디·전화번호·계좌번호)를 적어 주세요.'],
    services: ['complaint'],
    related: ['petition'],
    extras: [RESTITUTION_EXTRA],
  },
  crime_investigating: {
    id: 'crime_investigating',
    headline: '수사 중에는 피해자 의견을 정리해 낼 수 있어요.',
    lead: '수사기관이 피해 사실과 피해 정도를 정확히 알 수 있도록 의견서나 탄원서를 낼 수 있습니다. 출석을 앞두고 있다면 무엇을 확인하려는 출석인지 먼저 물어보세요.',
    procedures: [
      { area: 'criminal', title: '피해자 의견서', what: '피해 사실과 법리에 맞춘 피해자의 입장을 전달합니다.', doc: '의견서', where: '사건을 맡은 수사기관' },
      { area: 'criminal', title: '엄벌탄원서', what: '엄중한 처벌을 바란다는 뜻을 전달합니다.', doc: '탄원서', where: '수사기관 또는 법원' },
    ],
    todo: ['출석요구서나 사건번호, 담당 수사관 연락처를 확인해 주세요.', '처음 고소할 때 내지 못한 증거가 있으면 모아 주세요.'],
    services: ['victim-opinion', 'petition'],
    extras: [RESTITUTION_EXTRA],
  },
  crime_objection: {
    id: 'crime_objection',
    headline: '결정에 불복하는 절차를 살펴볼 수 있어요.',
    lead: '경찰의 불송치 결정에는 이의신청을, 검사의 불기소 처분에는 항고와 재정신청을 검토합니다. 결정 이유서를 보고 무엇이 부족하다고 봤는지부터 확인합니다.',
    deadline: '검사의 불기소 처분에 대한 항고는 통지를 받은 날부터 30일 안에 해야 합니다. 받은 통지서의 날짜를 먼저 확인해 주세요.',
    procedures: [
      { area: 'criminal', title: '불송치 이의신청 · 항고 · 재정신청', what: '수사기관의 결정을 다시 판단해 달라고 구합니다.', doc: '이의신청서 · 항고장 · 재정신청서', where: '결정을 한 경찰서 또는 검찰청' },
    ],
    todo: ['불송치 결정서나 불기소 이유 통지서를 준비해 주세요.', '처음 낸 고소장과 그 뒤에 새로 모은 증거를 준비해 주세요.'],
    services: ['objection'],
  },
  crime_trial: {
    id: 'crime_trial',
    headline: '형사재판 중이면 배상명령과 탄원서를 살펴보세요.',
    lead: '가해자의 형사재판에서 피해 배상을 함께 명해 달라고 신청할 수 있습니다. 별도 민사소송 없이 진행할 수 있는 방법입니다.',
    deadline: '배상명령은 1심 또는 2심 변론이 끝나기 전까지 신청해야 합니다.',
    procedures: [
      RESTITUTION_EXTRA.procedure,
      { area: 'criminal', title: '엄벌탄원서', what: '피해자로서 처벌에 대한 뜻을 재판부에 전달합니다.', doc: '탄원서', where: '재판을 맡은 법원' },
    ],
    todo: ['사건번호와 재판 날짜를 확인해 주세요(법원 안내문이나 나의 사건검색).', '피해 금액을 보여 주는 자료를 모아 주세요.'],
    services: ['restitution', 'petition'],
  },
  crime_mediation: {
    id: 'crime_mediation',
    headline: '형사조정에서는 합의 조건을 미리 정리해 가세요.',
    lead: '형사조정은 수사 중인 사건을 조정위원 앞에서 합의로 정리해 보는 절차입니다. 받을 금액과 조건을 미리 정하고 조정안을 검토합니다.',
    procedures: [
      { area: 'criminal', title: '형사조정', what: '피해 회복과 합의 조건을 조정합니다.', doc: '조정안 검토·합의서', where: '검찰청 형사조정위원회' },
    ],
    todo: ['조정 기일 안내문을 확인해 주세요.', '받고 싶은 금액과 그 근거(치료비·피해액)를 정리해 주세요.'],
    services: ['criminal-mediation'],
    related: ['settlement'],
  },
  defense: {
    id: 'defense',
    headline: '사실을 인정하는 사건은 양형 자료 준비가 중요해요.',
    lead: '사실관계에 다툼이 없는 사건은 반성, 피해 회복, 생활 사정 같은 양형 자료를 어떻게 준비하느냐를 중심으로 대응합니다.',
    procedures: [
      { area: 'criminal', title: '피의사건 변호', what: '수사와 재판에서 선처를 구하는 의견과 자료를 냅니다.', doc: '변호인 의견서 · 양형 자료', where: '사건을 맡은 수사기관 · 법원' },
    ],
    todo: ['출석요구서나 받은 서류를 준비해 주세요.', '피해자와 합의했는지, 합의할 수 있는지 적어 주세요.', '직장·가족 사정을 보여 줄 자료를 생각해 두세요.'],
    services: ['suspect-defense'],
  },
  defense_dispute: {
    id: 'defense_dispute',
    headline: '사실관계를 다투는 사건은 변호사와 개별 상담이 맞아요.',
    lead: '혐의를 다투는 사건은 진술 방향과 증거 판단이 결과에 큰 영향을 줍니다. 조사에 나가기 전에 변호사와 먼저 상의하세요.',
    procedures: [
      { area: 'consult', title: '피의사건 변호(다투는 사건)', what: '혐의에 대한 반박 의견과 증거를 냅니다.', doc: '변호인 의견서', where: '사건을 맡은 수사기관' },
    ],
    todo: ['출석요구서와 출석 날짜를 확인해 주세요.', '있었던 일을 시간 순서대로 적어 두세요.'],
    services: ['advanced'],
  },
  lease_registration: {
    id: 'lease_registration',
    headline: '이사 전에 임차권등기명령을 살펴보세요.',
    lead: '보증금을 받기 전에 이사하면 대항력과 우선변제권을 잃을 수 있습니다. 임차권등기가 된 뒤에 이사하면 그 권리를 유지할 수 있습니다.',
    deadline: '임차권등기가 등기부에 오른 것을 확인한 뒤에 이사하고 전입을 옮기세요.',
    procedures: [
      { area: 'civil', title: '임차권등기명령', what: '이사한 뒤에도 보증금에 대한 권리를 유지합니다.', doc: '임차권등기명령 신청서', where: '집 주소지 관할 법원' },
      { area: 'civil', title: '내용증명 → 지급명령', what: '보증금 반환을 요구하고, 응하지 않으면 법원의 명령을 구합니다.', doc: '내용증명 · 지급명령신청서', where: '집주인 주소 · 관할 법원' },
    ],
    todo: ['임대차계약서와 계약이 끝난 날짜를 확인해 주세요.', '확정일자·전입신고 자료를 준비해 주세요.'],
    services: ['lease-registration', 'certified-letter'],
    related: ['payment-order'],
  },
  lease_letter: {
    id: 'lease_letter',
    headline: '내용증명으로 보증금 반환을 정식으로 요구할 수 있어요.',
    lead: '계약이 끝났거나 끝날 예정이라면 반환을 요구한 기록을 먼저 남깁니다. 이사를 해야 하게 되면 임차권등기명령을 먼저 살펴보세요.',
    procedures: [
      { area: 'civil', title: '내용증명 발송', what: '보증금 반환과 기한을 공식적으로 요구합니다.', doc: '내용증명', where: '집주인 주소로 우편 발송' },
      { area: 'civil', title: '지급명령 신청(반환하지 않으면)', what: '보증금을 돌려주라는 법원의 명령을 구합니다.', doc: '지급명령신청서', where: '관할 법원' },
    ],
    todo: ['임대차계약서와 보증금 이체 내역을 준비해 주세요.', '계약이 끝나는 날짜와 집주인에게 알린 기록을 확인해 주세요.'],
    services: ['certified-letter', 'payment-order'],
    related: ['lease-registration'],
  },
  inherit_renounce: {
    id: 'inherit_renounce',
    headline: '빚이 걱정되면 상속포기나 한정승인을 살펴보세요.',
    lead: '상속포기는 재산과 빚을 모두 받지 않는 것이고, 한정승인은 물려받은 재산 범위 안에서만 빚을 갚는 것입니다. 가족마다 따로 정할 수 있습니다.',
    deadline: '상속이 시작된 것을 안 날부터 3개월 안에 가정법원에 신고해야 합니다.',
    procedures: [
      { area: 'family', title: '상속포기 · 한정승인 신고', what: '물려받을 빚에 대한 책임을 정리합니다.', doc: '상속포기 신고서 · 한정승인 신고서', where: '돌아가신 분의 마지막 주소지 관할 가정법원' },
    ],
    todo: ['돌아가신 날짜와 그 사실을 안 날을 확인해 주세요.', '안심상속 원스톱 서비스로 재산과 빚을 조회해 보세요.', '함께 상속받는 가족이 누구인지 적어 주세요.'],
    services: ['inheritance-package'],
  },
  inherit_division: {
    id: 'inherit_division',
    headline: '상속인끼리 합의한 내용을 협의서로 남기세요.',
    lead: '상속재산분할협의서가 있어야 부동산 등기나 예금 정리를 할 수 있습니다. 미성년 자녀가 함께 상속인이면 특별대리인 선임이 먼저 필요합니다.',
    procedures: [
      { area: 'family', title: '상속재산분할협의 · 특별대리인 선임', what: '나눌 재산과 몫을 정해 문서로 만듭니다.', doc: '상속재산분할협의서 · 특별대리인 선임 청구서', where: '등기소·은행 · 가정법원' },
    ],
    todo: ['상속인 전원의 이름과 연락처를 정리해 주세요.', '나눌 재산 목록(부동산·예금·자동차)을 적어 주세요.'],
    services: ['inheritance-division'],
  },
  divorce_agreement: {
    id: 'divorce_agreement',
    headline: '합의한 내용을 빠짐없이 문서로 남기세요.',
    lead: '협의이혼은 법원에서 이혼 의사를 확인받는 절차입니다. 재산분할·위자료·양육 조건은 합의서로 따로 남겨 두어야 나중에 다툼을 줄일 수 있습니다.',
    procedures: [
      { area: 'family', title: '협의이혼 의사확인', what: '부부가 함께 법원에서 이혼 의사를 확인받습니다.', doc: '협의이혼의사확인신청서 · 양육 협의서 · 재산분할 합의서', where: '가정법원' },
    ],
    todo: ['합의한 재산분할·위자료·양육 조건을 적어 주세요.', '혼인관계증명서와 가족관계증명서를 준비해 주세요.'],
    services: ['divorce-agreement'],
  },
  divorce_mediation: {
    id: 'divorce_mediation',
    headline: '남은 조건은 법원 조정으로 정리할 수 있어요.',
    lead: '이혼에는 뜻이 모였지만 재산이나 양육 조건 일부가 남았다면, 조정으로 한 번에 정리하는 방법이 있습니다.',
    procedures: [
      { area: 'family', title: '이혼 조정신청', what: '조정위원과 함께 이혼 조건을 정합니다.', doc: '조정신청서', where: '가정법원' },
    ],
    todo: ['합의한 조건과 남은 쟁점을 나눠 적어 주세요.', '부부 재산 자료를 모아 주세요.'],
    services: ['divorce-mediation'],
    related: ['divorce-suit'],
  },
  divorce_suit: {
    id: 'divorce_suit',
    headline: '합의가 되지 않으면 이혼 소송을 살펴보세요.',
    lead: '이혼 소송에서는 이혼 사유와 재산분할·위자료·양육 문제를 함께 다툽니다. 재산을 처분할 우려가 있으면 보전 절차도 함께 검토합니다.',
    procedures: [
      { area: 'family', title: '이혼 소송', what: '법원 판결로 이혼과 조건을 정합니다.', doc: '소장', where: '가정법원' },
    ],
    todo: ['이혼 사유를 보여 주는 자료(대화·사진·진단서)를 모아 주세요.', '부부 재산 자료(부동산·예금·대출·연금)를 정리해 주세요.'],
    services: ['divorce-suit'],
    related: ['divorce-mediation'],
  },
  paramour: {
    id: 'paramour',
    headline: '부정행위 상대방에 대한 위자료 소송을 살펴보세요.',
    lead: '청구하는 쪽이든 소장을 받은 쪽이든 맡길 수 있습니다. 소장을 받았다면 답변서 기한부터 확인해 주세요.',
    deadline: '소장을 받았다면 받은 날부터 30일 안에 답변서를 내야 합니다.',
    procedures: [
      { area: 'family', title: '상간자 위자료 소송', what: '부정행위로 인한 위자료를 청구하거나 그 청구에 대응합니다.', doc: '소장 · 답변서', where: '관할 법원' },
    ],
    todo: ['부정행위를 보여 주는 자료나, 받은 소장을 준비해 주세요.', '상대방 이름과 주소처럼 아는 정보를 적어 주세요.'],
    services: ['paramour-suit'],
  },
  child_support: {
    id: 'child_support',
    headline: '양육비를 급여에서 바로 받는 절차가 있어요.',
    lead: '판결·조서로 정해진 양육비를 2회 이상 받지 못했다면, 상대방 회사가 급여에서 양육비를 떼어 직접 주도록 법원에 신청할 수 있습니다.',
    procedures: [
      { area: 'family', title: '양육비 직접지급명령', what: '상대방 급여에서 양육비를 직접 받습니다.', doc: '양육비 직접지급명령 신청서', where: '가정법원' },
    ],
    todo: ['양육비를 정한 판결문·조정조서를 준비해 주세요.', '받지 못한 달과 금액을 정리해 주세요.', '상대방의 직장을 확인해 주세요.'],
    services: ['child-support-order'],
  },
  guardianship: {
    id: 'guardianship',
    headline: '법원에 후견인을 정해 달라고 청구할 수 있어요.',
    lead: '치매나 장애로 스스로 재산을 관리하기 어려운 가족이 있으면, 가정법원에 성년후견이나 한정후견을 청구할 수 있습니다.',
    procedures: [
      { area: 'family', title: '성년 · 한정후견 개시', what: '재산 관리와 법률 행위를 도울 후견인을 정합니다.', doc: '후견개시 심판청구서', where: '본인 주소지 관할 가정법원', caution: '법원이 정신감정을 명할 수 있습니다.' },
    ],
    todo: ['진단서나 장애 관련 서류를 준비해 주세요.', '다른 가족의 의견을 확인해 주세요.'],
    services: ['guardianship'],
  },
  name_change: {
    id: 'name_change',
    headline: '개명은 가정법원의 허가를 받는 절차예요.',
    lead: '바꾸려는 이름과 이유를 적어 법원에 신청합니다. 이유를 뒷받침하는 자료가 있으면 함께 냅니다.',
    procedures: [
      { area: 'family', title: '개명허가 신청', what: '이름을 바꾸는 것을 허가받습니다.', doc: '개명허가 신청서', where: '주소지 관할 가정법원' },
    ],
    todo: ['기본증명서와 가족관계증명서를 준비해 주세요.', '바꾸려는 이름과 그 이유를 적어 주세요.'],
    services: ['name-change'],
  },
  license: {
    id: 'license',
    headline: '면허 처분은 이의신청과 행정심판으로 다툴 수 있어요.',
    lead: '처분 사유와 생계 사정을 정리해 시·도경찰청 이의신청이나 행정심판을 청구합니다. 두 절차의 기한이 달라 통지서 날짜부터 확인합니다.',
    deadline: '이의신청은 처분을 안 날부터 60일, 행정심판은 처분을 안 날부터 90일(처분이 있었던 날부터 180일) 안에 해야 합니다.',
    procedures: [
      { area: 'admin', title: '이의신청 · 행정심판', what: '처분을 취소하거나 줄여 달라고 구합니다.', doc: '이의신청서 · 행정심판청구서', where: '시·도경찰청 · 중앙행정심판위원회', caution: '청구만으로 처분의 효력이 멈추지는 않습니다. 필요하면 집행정지를 함께 검토합니다.' },
    ],
    todo: ['처분 통지서와 받은 날짜를 확인해 주세요.', '운전이 생계에 필요하다는 자료(재직증명서·사업자등록증)를 준비해 주세요.'],
    services: ['license-relief'],
  },
  school: {
    id: 'school',
    headline: '심의 전에는 의견서를, 결정 뒤에는 행정심판을 살펴보세요.',
    lead: '학교폭력대책심의위원회에 낼 의견서로 사실관계와 학생의 사정을 전달합니다. 조치 결정에 불복하려면 행정심판을 청구할 수 있습니다. 가해 학생 측과 피해 학생 측 모두 맡길 수 있습니다.',
    deadline: '조치 결정에 대한 행정심판은 처분을 안 날부터 90일(처분이 있었던 날부터 180일) 안에 청구해야 합니다.',
    procedures: [
      { area: 'admin', title: '심의위원회 의견서 · 행정심판', what: '사실관계와 학생의 사정을 전달하고, 결정에 불복합니다.', doc: '의견서 · 행정심판청구서', where: '교육지원청 심의위원회 · 행정심판위원회' },
    ],
    todo: ['받은 통지서·결정서와 심의 날짜를 확인해 주세요.', '사건 경위를 시간 순서대로 적어 주세요.'],
    services: ['school-violence'],
  },
  contract: {
    id: 'contract',
    headline: '서명 전에 조항별 위험을 확인해 보세요.',
    lead: '서명한 뒤에는 조항을 바꾸기 어렵습니다. 걱정되는 조항과 계약의 목적을 함께 알려 주시면 그 부분을 중심으로 검토합니다.',
    procedures: [
      { area: 'advisory', title: '계약서 검토', what: '조항마다 위험 정도와 수정 의견을 받습니다.', doc: '검토 의견서', where: '—' },
    ],
    todo: ['계약서 파일(초안 또는 상대방 안)을 준비해 주세요.', '특히 걱정되는 조항을 표시해 주세요.'],
    services: ['contract-review'],
  },
  labor: {
    id: 'labor',
    headline: '노무 문제는 사안 하나를 끝까지 검토받을 수 있어요.',
    lead: '해고·징계, 임금, 직장 내 괴롭힘처럼 하나의 노무 문제를 정해 사실관계와 대응 방향을 검토합니다.',
    procedures: [
      { area: 'advisory', title: '노무 · 인사 자문', what: '절차와 대응 방향을 검토합니다.', doc: '자문 의견서', where: '—' },
    ],
    todo: ['취업규칙·근로계약서 등 관련 문서를 준비해 주세요.', '지금까지의 경과를 정리해 주세요.'],
    services: ['labor-hr'],
  },
  agency: {
    id: 'agency',
    headline: '답변해야 하는 기한부터 확인하세요.',
    lead: '행정기관 조사나 언론 보도에는 답변 기한과 대응 방향을 먼저 정합니다. 답변서와 입장문을 함께 검토합니다.',
    procedures: [
      { area: 'advisory', title: '기관 · 언론 대응 자문', what: '대응 방향을 세우고 답변서·입장문을 검토합니다.', doc: '답변서 · 입장문', where: '해당 기관 · 언론사' },
    ],
    todo: ['받은 공문이나 기사, 질의서를 준비해 주세요.', '답해야 하는 기한을 확인해 주세요.'],
    services: ['agency-media'],
  },
  unsure: {
    id: 'unsure',
    headline: '상황을 알려 주시면 변호사가 맞는 절차를 안내해요.',
    lead: '정해진 상품에 맞지 않거나 어떤 절차인지 판단하기 어려운 일은 개별 상담으로 시작합니다. 받은 서류가 있으면 함께 보여 주세요.',
    procedures: [
      { area: 'consult', title: '심화 사건 상담', what: '자료를 보고 절차와 비용을 개별로 안내합니다.', doc: '—', where: '—' },
    ],
    todo: ['받은 서류나 관련 자료를 사진·파일로 준비해 주세요.', '있었던 일을 시간 순서대로 적어 주세요.'],
    services: ['advanced'],
  },
};

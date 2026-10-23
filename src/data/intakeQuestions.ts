/**
 * 상품별 문진 문항 — 서면에 들어갈 요건사실 기준으로 만든다(개발계획 §5-3 "문진을 요건사실 체크리스트와 1:1로").
 * 답변은 사건의 intake.answers 에 질문 라벨 그대로 저장되어 관리자 검수 화면에 표시된다.
 * 문항 문구는 초안 — 담당 변호사 검토 후 확정할 것.
 */
export interface Question {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'select' | 'number';
  required?: boolean;
  hint?: string;
  options?: string[];
  placeholder?: string;
}

const MONEY_CAUSE = ['대여금', '물품대금', '용역·공사대금', '임대차 보증금', '임금·퇴직금', '기타'];

export const INTAKE_QUESTIONS: Record<string, Question[]> = {
  'certified-letter': [
    { key: 'cause', label: '받을 돈의 원인', type: 'select', required: true, options: MONEY_CAUSE },
    { key: 'arose_on', label: '돈을 건넨(거래한) 날', type: 'date', required: true },
    { key: 'due_on', label: '갚기로 한 날', type: 'date', hint: '약속한 날이 없으면 비워 두세요.' },
    { key: 'opponent_address', label: '상대방 주소', type: 'text', required: true, hint: '내용증명을 보낼 주소입니다. 모르면 마지막으로 알던 주소를 적어 주세요.' },
    { key: 'deadline_days', label: '요구할 지급 기한(받은 날부터)', type: 'select', options: ['7일', '14일', '30일'], required: true },
    { key: 'evidence_kinds', label: '가지고 있는 증거', type: 'text', placeholder: '예: 차용증, 계좌이체 내역, 카카오톡 대화' },
  ],
  'payment-order': [
    { key: 'cause', label: '받을 돈의 원인', type: 'select', required: true, options: MONEY_CAUSE },
    { key: 'arose_on', label: '돈을 건넨(거래한) 날', type: 'date', required: true },
    { key: 'due_on', label: '갚기로 한 날', type: 'date', hint: '지연손해금 계산의 기준이 됩니다.' },
    { key: 'paid_back', label: '일부라도 받은 금액', type: 'number', placeholder: '없으면 0' },
    { key: 'interest', label: '약정한 이자·지연이율', type: 'text', placeholder: '예: 연 5%, 약정 없음' },
    { key: 'opponent_address', label: '채무자 주소', type: 'text', required: true, hint: '지급명령은 송달되어야 효력이 생깁니다. 정확할수록 빠릅니다.' },
    { key: 'opponent_id', label: '채무자 생년월일 또는 사업자번호(아는 경우)', type: 'text' },
    { key: 'certified_sent', label: '내용증명을 보냈나요?', type: 'select', options: ['보냈다', '안 보냈다'] },
  ],
  'complaint-basic': complaintQuestions(),
  'complaint-standard': complaintQuestions(),
  'draft-review': [
    { key: 'doc_type', label: '검토받을 서면', type: 'select', required: true, options: ['소장', '답변서', '준비서면', '고소장', '지급명령 신청서', '내용증명', '기타'] },
    { key: 'submit_to', label: '제출할 곳', type: 'text', placeholder: '예: 서울중앙지방법원, ○○경찰서' },
    { key: 'submit_by', label: '제출 기한', type: 'date', hint: '기한이 촉박하면 수임 검토 때 먼저 확인합니다.' },
    { key: 'concern', label: '특히 확인받고 싶은 부분', type: 'textarea' },
  ],
};

function complaintQuestions(): Question[] {
  return [
    { key: 'crime', label: '피해 유형', type: 'select', required: true, options: ['사기', '횡령·배임', '명예훼손', '모욕', '폭행·상해', '협박', '기타'] },
    { key: 'occurred_on', label: '피해가 일어난 날', type: 'date', required: true, hint: '친고죄(모욕 등)는 범인을 알게 된 날부터 6개월 안에 고소해야 합니다.' },
    { key: 'damage', label: '피해 금액(재산 피해인 경우)', type: 'number' },
    { key: 'opponent_info', label: '상대방에 대해 아는 정보', type: 'textarea', placeholder: '이름, 연락처, 계좌번호, 닉네임·아이디, 주소 등 아는 대로' },
    { key: 'police', label: '이미 신고·상담한 수사기관(있으면)', type: 'text' },
  ];
}

export const questionsFor = (slug: string) => INTAKE_QUESTIONS[slug] ?? [];

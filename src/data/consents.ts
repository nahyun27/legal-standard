/**
 * 가입 동의 항목. 개인정보 수집·이용 동의는 개인정보보호법 제15조 제2항의 고지 사항(목적·항목·보유기간·거부 권리)을
 * 담아야 한다. 아래 문구는 초안 — 법무법인 확정 문안으로 교체할 것(/privacy 처리방침과도 일치해야 함).
 */
export interface Consent {
  key: 'agree_terms' | 'agree_privacy' | 'marketing_consent';
  label: string;
  required: boolean;
  href?: string;
  detail?: string[];
}

export const CONSENTS: Consent[] = [
  { key: 'agree_terms', label: '이용약관 동의', required: true, href: '/terms' },
  {
    key: 'agree_privacy',
    label: '개인정보 수집·이용 동의',
    required: true,
    href: '/privacy',
    detail: [
      '수집 항목: 이름, 휴대폰 번호, 소셜 계정 식별값, 이메일(소셜 계정에서 제공한 경우)',
      '이용 목적: 회원 식별, 사건 접수와 수임 검토(이해충돌 확인 포함), 진행 상황 안내',
      '보유 기간: 회원 탈퇴 시까지. 단, 수임한 사건의 기록은 관계 법령이 정한 기간 동안 보관합니다.',
      '동의를 거부할 수 있으나, 거부 시 회원가입과 사건 접수를 할 수 없습니다.',
    ],
  },
  {
    key: 'marketing_consent',
    label: '서비스 소식·혜택 안내 수신',
    required: false,
    detail: ['새 서비스와 이용 안내를 문자·이메일로 보내 드립니다. 동의하지 않아도 서비스 이용에 제한이 없으며, 언제든 내 정보에서 철회할 수 있습니다.'],
  },
];

'use client';

/** 관리자 화면 공용 조각 */

export function StatusPill({ status, label }: { status: string; label: string }) {
  return <span className={`status-pill s-${status}`}>{label}</span>;
}

export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="pager">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)}>이전</button>
      <span>{page} / {pages}</span>
      <button disabled={page >= pages} onClick={() => onPage(page + 1)}>다음</button>
    </div>
  );
}

export function AdminHead({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="admin-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export const ACTION_LABEL: Record<string, string> = {
  'case.create': '사건 접수', 'case.cancel': '접수 취소', 'payment.confirm': '결제 완료', 'case.view': '사건 열람',
  'case.accept': '수임 확정', 'case.reject': '수임 불성립·환불', 'case.submit_review': '검수 요청', 'case.approve': '검수 완료',
  'case.send_back': '검수 반려', 'case.deliver': '발송·제출 완료', 'case.note': '메모',
  'file.upload': '파일 업로드', 'file.download': '파일 다운로드',
  'user.view': '회원 정보 열람', 'user.suspend': '이용 정지', 'user.unsuspend': '정지 해제', 'user.roles': '권한 변경',
  'case.quote': '견적 발송', 'case.citations': '인용 확인', 'case.expire': '결제 대기 자동 취소',
  'payment.mismatch': '결제 금액 불일치', 'payment.canceled_external': '결제사 취소',
  'mfa.enable': '2단계 인증 등록', 'mfa.fail': '2단계 인증 실패', 'mfa.reset': '2단계 인증 초기화', 'conflict_list.replace': '이해충돌 명단 교체',
};

export const USER_STATUS: Record<string, string> = { active: '정상', pending: '가입 미완료', suspended: '이용 정지', withdrawn: '탈퇴' };
export const PROVIDER: Record<string, string> = { kakao: '카카오', naver: '네이버', dev: '개발용' };

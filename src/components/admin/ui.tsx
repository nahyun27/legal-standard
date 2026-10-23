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

/** 사유 입력이 필요한 조치용 — 브라우저 prompt 대신 쓰는 최소 대화상자 */
export function promptReason(message: string): string | null {
  const v = window.prompt(`${message}\n(사유는 감사 로그에 남습니다)`);
  if (v === null) return null;
  return v.trim().length >= 2 ? v.trim() : (alert('사유를 2자 이상 입력해 주세요.'), null);
}

export const ACTION_LABEL: Record<string, string> = {
  'case.create': '사건 접수', 'case.cancel': '접수 취소', 'payment.confirm': '결제 완료', 'case.view': '사건 열람',
  'case.accept': '수임 확정', 'case.reject': '수임 불성립·환불', 'case.submit_review': '검수 요청', 'case.approve': '검수 완료',
  'case.send_back': '검수 반려', 'case.deliver': '발송·제출 완료', 'case.note': '메모',
  'file.upload': '파일 업로드', 'file.download': '파일 다운로드',
  'user.view': '회원 정보 열람', 'user.suspend': '이용 정지', 'user.unsuspend': '정지 해제', 'user.roles': '권한 변경',
};

export const USER_STATUS: Record<string, string> = { active: '정상', pending: '가입 미완료', suspended: '이용 정지', withdrawn: '탈퇴' };
export const PROVIDER: Record<string, string> = { kakao: '카카오', naver: '네이버', dev: '개발용' };

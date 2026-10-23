import Link from 'next/link';
import { AlertCircle, CircleSlash } from 'lucide-react';
import { NOINDEX } from '@/lib/seo';

export const metadata = { title: '결제 실패', robots: NOINDEX };

export default async function Page({ searchParams }: PageProps<'/payments/fail'>) {
  const q = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const canceled = one(q.code) === 'PAY_PROCESS_CANCELED';
  const caseId = one(q.case);
  return (
    <div className="container auth-wrap">
      <div className="auth-card status-screen">
        <span className={`status-icon ${canceled ? 'warn' : 'err'}`}>{canceled ? <CircleSlash size={30} /> : <AlertCircle size={30} />}</span>
        <h1 className="auth-title">{canceled ? '결제를 취소했습니다' : '결제하지 못했습니다'}</h1>
        {!canceled && one(q.message) && <p className="form-error" style={{ margin: '16px 0' }}>{one(q.message)}</p>}
        <p className="sub" style={{ margin: '12px 0 20px' }}>작성하신 문진은 저장되어 있습니다. 내 사건에서 다시 결제할 수 있습니다.</p>
        <Link href={caseId ? `/my/cases/${caseId}` : '/my'} className="btn btn-primary">내 사건으로</Link>
      </div>
    </div>
  );
}

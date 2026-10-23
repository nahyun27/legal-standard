import Link from 'next/link';
import { Compass } from 'lucide-react';

// 루트 not-found 는 (site) 레이아웃 밖이라 헤더·푸터가 없다 — 홈으로 갈 길만 분명히 준다.
export default function NotFound() {
  return (
    <main className="container section" style={{ textAlign: 'center', paddingTop: 120 }}>
      <Link href="/" className="logo" style={{ justifyContent: 'center', marginBottom: 32 }}>
        <span className="dot" aria-hidden="true" />리걸스탠다드
      </Link>
      <div className="status-screen"><span className="status-icon warn"><Compass size={30} /></span></div>
      <h1>페이지를 찾을 수 없습니다</h1>
      <p className="lead" style={{ margin: '14px auto 24px' }}>주소가 바뀌었거나 아직 오픈하지 않은 서비스일 수 있습니다.</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/" className="btn btn-ghost">홈으로</Link>
        <Link href="/services" className="btn btn-primary">서비스·가격 보기</Link>
      </div>
    </main>
  );
}

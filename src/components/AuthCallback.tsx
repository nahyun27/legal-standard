'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { safeNext } from '@/lib/api';

/** 소셜 로그인 직후 도착하는 곳. 백엔드가 쿠키를 이미 심어 두었으므로 내 정보를 다시 읽고 다음 화면으로 보낸다. */
export default function AuthCallback({ next }: { next?: string }) {
  const router = useRouter();
  const { reload } = useAuth();

  useEffect(() => {
    const target = safeNext(next);
    reload().then((me) => {
      if (!me) router.replace('/login?error=failed');
      else if (!me.is_onboarded) router.replace(`/signup?next=${encodeURIComponent(target)}`);
      else router.replace(target);
    });
  }, [next, reload, router]);

  return (
    <div className="container auth-wrap">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="spinner" aria-hidden="true" />
        <p className="sub" style={{ marginTop: 16 }}>로그인 정보를 확인하고 있습니다…</p>
      </div>
    </div>
  );
}

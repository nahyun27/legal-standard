import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/components/AuthProvider';
import { ALLOW_INDEXING, NOINDEX, SITE_NAME, SITE_URL } from '@/lib/seo';
import { FIRM } from '@/lib/site';
import './globals.css';

const TITLE = `${SITE_NAME}: 전 구간 정찰제 법률서비스 · ${FIRM.name}`;
const DESCRIPTION =
  '내용증명·지급명령·고소장부터 소송 전환, 강제집행까지. 다음 단계의 비용과 업무범위를 결제 전에 공개하는 정찰제 법률서비스. ' +
  '모든 서면은 법무법인 소속 변호사가 검토·서명합니다.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: `%s | ${SITE_NAME}` },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  robots: ALLOW_INDEXING ? { index: true, follow: true } : NOINDEX,
  openGraph: { title: TITLE, description: DESCRIPTION, siteName: SITE_NAME, locale: 'ko_KR', type: 'website' },
};

export const viewport: Viewport = { themeColor: '#14213d' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* 스크롤 등장 효과(Reveal)의 숨김 상태는 JS 가 돌 때만 적용한다 — JS 없이도 내용이 보이게 */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        {/* 헤드라인 명조(프로토타입과 동일) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        {/* 공개 사이트의 헤더·푸터는 (site)/layout, 관리자 화면은 admin/layout 이 각자 그린다 */}
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

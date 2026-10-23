import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
// 본문 폰트(프리텐다드)는 npm 패키지에서 같은 주소로 제공한다 — 외부 CDN 스타일시트는 화면 그리기를 막아
// VPN·느린 망에서 첫 화면이 수 초 멈췄다(2026-10, 실측 2.1초).
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import { AuthProvider } from '@/components/AuthProvider';
import { RevealBoot } from '@/components/Reveal';
import { ALLOW_INDEXING, NOINDEX, SITE_NAME, SITE_URL } from '@/lib/seo';
import { FIRM } from '@/lib/site';
import './globals.css';

// 제목 폰트: 마루 부리(네이버, OFL — 재배포 허용). 제목에만 쓰는 600·700 두 굵기만 둔다.
const maruBuri = localFont({
  src: [
    { path: './fonts/MaruBuri-SemiBold.woff2', weight: '600', style: 'normal' },
    { path: './fonts/MaruBuri-Bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-serif',
  display: 'swap',
  preload: false, // 한글 전체 글리프라 굵기당 450KB — 미리 받지 않고 제목이 그려질 때 받는다(그동안 대체 글꼴)
  fallback: ['Apple SD Gothic Neo', 'serif'],
});

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
    <html lang="ko" className={maruBuri.variable} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
      </head>
      <body>
        {/* 공개 사이트의 헤더·푸터는 (site)/layout, 관리자 화면은 admin/layout 이 각자 그린다 */}
        <AuthProvider>{children}</AuthProvider>
        {/* 스크롤 등장 효과는 React 가 붙은 뒤에만 켠다 — 그 전에는 내용을 숨기지 않는다(느린 기기에서 빈 화면 방지) */}
        <RevealBoot />
      </body>
    </html>
  );
}

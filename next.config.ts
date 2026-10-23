import { networkInterfaces } from 'node:os';
import type { NextConfig } from 'next';

// 기본 보안 헤더(폴리스맵과 동일). CSP 는 결제(토스페이먼츠) 스크립트 허용 목록이 정해진 뒤 따로 넣는다.
const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
];

// 개발 서버는 localhost 가 아닌 주소에서 오는 개발용 요청(/_next 등)을 막는다(Next 16 기본값).
// 같은 와이파이의 휴대폰·다른 PC 에서 이 컴퓨터 IP 로 열어 볼 수 있게 이 컴퓨터의 LAN IP 를 허용한다.
// 다른 주소가 더 필요하면 DEV_ORIGINS=host1,host2 로 추가한다.
function lanAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i!.address);
}

// 백엔드 API 는 같은 주소의 /api/v1 로 받아 src/app/api/v1/[...path]/route.ts 가 백엔드로 넘긴다.

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: [...lanAddresses(), ...(process.env.DEV_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean) ?? [])],
  async redirects() {
    // "왜 이 가격인가"는 내용이 얇아 소개 페이지의 한 섹션으로 합쳤다(2026-10) — 예전 링크는 그 섹션으로
    return [{ source: '/why', destination: '/about#why', permanent: true }];
  },
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;

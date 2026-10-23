/**
 * 검색엔진 색인 정책 — 한곳에서 관리한다.
 * ALLOW_INDEXING 이 false(기본값)면 사이트 전체가 noindex 다. 광고심사위원회 사전 질의 회신을 받고
 * 정식 오픈할 때만 true 로 켠다(사업기획서 X-3: 론칭 전 사전 질의 필수).
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
export const ALLOW_INDEXING = process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true';

export const NOINDEX = { index: false, follow: false } as const;

export const SITE_NAME = '리걸스탠다드';

/** 페이지 메타데이터 공통 틀. openGraph 는 하위 페이지에서 지정하면 상위 값을 통째로 덮어쓰므로
 * siteName·locale·url 을 여기서 매번 함께 채운다. */
export function pageMeta({ title, description, path }: { title: string; description: string; path: string }) {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} | ${SITE_NAME}`, description, url: path, siteName: SITE_NAME, locale: 'ko_KR', type: 'website' as const,
    },
  };
}

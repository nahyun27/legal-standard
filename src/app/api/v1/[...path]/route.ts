/**
 * 백엔드 API 프록시. 브라우저는 같은 주소의 /api/v1 만 부르고, 여기서 백엔드(API_PROXY_TARGET)로 넘긴다.
 * 그래서 localhost·LAN IP·운영 도메인 어디로 접속해도 로그인 쿠키가 같은 사이트 쿠키가 되고 CORS 가 필요 없다.
 *
 * next.config 의 rewrites 로도 되지만, 그쪽은 접속자 IP(X-Forwarded-For)를 넘기지 않아 감사 로그·개인정보 접속기록에
 * 모든 요청이 127.0.0.1 로 남는다 — 그래서 직접 넘긴다. 운영에서 Nginx 가 /api 를 백엔드로 바로 보내면 이 파일은 거치지 않는다.
 * 백엔드(uvicorn)는 기본적으로 127.0.0.1 에서 온 X-Forwarded-For 만 믿는다(--forwarded-allow-ips).
 */
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const TARGET = process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:8002';
// 요청·응답을 그대로 흘려보낼 때 다시 계산되거나 의미가 바뀌는 헤더는 넘기지 않는다
const HOP_BY_HOP = ['host', 'connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'content-length', 'expect'];

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const search = req.nextUrl.search;
  const target = `${TARGET}/api/v1/${path.map(encodeURIComponent).join('/')}${search}`;

  const headers = new Headers(req.headers);
  HOP_BY_HOP.forEach((h) => headers.delete(h));
  // 접속자 IP — Next 서버가 요청을 받을 때 x-forwarded-for 를 채워 둔다(앞단에 다른 프록시가 있으면 그 값을 이어 받음)
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) headers.set('x-forwarded-for', forwardedFor);
  headers.set('x-forwarded-host', req.headers.get('host') ?? '');
  headers.set('x-forwarded-proto', req.nextUrl.protocol.replace(':', ''));

  const hasBody = !['GET', 'HEAD'].includes(req.method);
  let res: Response;
  try {
    res = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? req.body : undefined,
      // 업로드를 메모리에 다 올리지 않고 흘려보낸다
      ...(hasBody ? { duplex: 'half' } : {}),
      redirect: 'manual', // 소셜 로그인 리다이렉트(302 + Set-Cookie)를 브라우저에 그대로 전달
      cache: 'no-store',
    } as RequestInit);
  } catch {
    return Response.json({ detail: '서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 502 });
  }

  const out = new Headers();
  res.headers.forEach((v, k) => {
    // fetch 가 압축을 이미 풀었으므로 content-encoding·length 는 빼고, set-cookie 는 아래에서 한 줄씩 넣는다
    if (!['content-encoding', 'content-length', 'set-cookie', ...HOP_BY_HOP].includes(k)) out.set(k, v);
  });
  for (const c of res.headers.getSetCookie()) out.append('set-cookie', c);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };

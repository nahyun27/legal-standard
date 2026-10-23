/**
 * 백엔드 API 클라이언트. 로그인은 httpOnly 쿠키라 JS 가 토큰을 만지지 않는다 — credentials: 'include' 만 붙인다.
 * access 토큰(30분)이 만료돼 401 이 오면 refresh 를 한 번 시도하고 원래 요청을 다시 보낸다.
 *
 * 기본은 같은 주소의 /api/v1 (src/app/api/v1/[...path]/route.ts 가 백엔드로 넘긴다). 백엔드를 다른 도메인에 따로 둘 때만
 * NEXT_PUBLIC_API_BASE_URL 을 지정한다 — 그 경우엔 백엔드 CORS_ORIGINS 와 쿠키 도메인을 맞춰야 한다.
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
const V1 = `${API_BASE}/api/v1`;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body.detail === 'string') return body.detail;
    // pydantic 검증 오류: [{ msg: 'Value error, 휴대폰 번호 형식이…' }]
    if (Array.isArray(body.detail) && body.detail[0]?.msg) return String(body.detail[0].msg).replace(/^Value error, /, '');
  } catch {}
  return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const res = await fetch(`${V1}${path}`, {
    ...init,
    credentials: 'include',
    headers: init.body ? { 'Content-Type': 'application/json', ...init.headers } : init.headers,
  });
  if (res.status === 401 && retry && !path.startsWith('/auth/refresh')) {
    const r = await fetch(`${V1}/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (r.ok) return api<T>(path, init, false);
  }
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res));
  return res.json() as Promise<T>;
}

export interface User {
  id: number;
  social_provider: 'kakao' | 'naver' | 'dev';
  email: string | null;
  name: string | null;
  phone: string | null;
  marketing_consent: boolean | null;
  is_onboarded: boolean;
  is_admin: boolean;
  is_lawyer: boolean;
  created_at: string;
}

export interface Providers {
  kakao: boolean;
  naver: boolean;
  dev: boolean;
}

/** 소셜 로그인 시작 주소. 백엔드가 provider 인가 화면으로 보낸다. */
export const socialLoginUrl = (provider: 'kakao' | 'naver', next: string) =>
  `${V1}/auth/social/${provider}/login?next=${encodeURIComponent(next)}`;

/** 로그인 후 돌아갈 경로는 사이트 내부 경로만 허용한다(백엔드 safe_next 와 같은 규칙). */
export function safeNext(path: string | null | undefined): string {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return '/';
  return path;
}

export const formatPhone = (p: string | null) =>
  p ? p.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-$2-$3') : '';

/** 파일 업로드(multipart). Content-Type 은 브라우저가 boundary 와 함께 정한다. */
export async function upload<T>(path: string, file: File, fields: Record<string, string> = {}): Promise<T> {
  const body = new FormData();
  body.append('file', file);
  for (const [k, v] of Object.entries(fields)) body.append(k, v);
  const res = await fetch(`${V1}${path}`, { method: 'POST', credentials: 'include', body });
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res));
  return res.json() as Promise<T>;
}

/** 파일 다운로드 주소. 쿠키로 권한을 확인하므로 같은 브라우저에서 링크로 열면 된다. */
export const fileUrl = (id: number) => `${V1}/files/${id}`;

export interface CostLine {
  label: string;
  amount: number;
  note: string | null;
}

export interface Quote {
  service_slug: string;
  service_name: string;
  is_quote: boolean;
  fee: number;
  vat: number;
  costs: CostLine[];
  costs_total: number;
  total: number;
}

export interface CaseFile {
  id: number;
  kind: 'evidence' | 'document';
  filename: string;
  size: number;
  created_at: string;
}

export type CaseStatus =
  | 'pending_payment' | 'reviewing' | 'in_progress' | 'lawyer_review' | 'approved' | 'delivered' | 'rejected' | 'canceled';

export interface CaseDetail {
  id: number;
  case_no: string;
  service_slug: string;
  service_name: string;
  status: CaseStatus;
  status_label: string;
  opponent_name: string | null;
  claim_amount: number | null;
  intake: { client_name?: string; phone?: string; facts?: string; answers?: Record<string, string> };
  fee: number;
  vat: number;
  costs: CostLine[];
  total: number;
  lawyer_name: string | null;
  quote_note: string | null;
  parent_case_id: number | null;
  receipt_url: string | null;
  refunded: boolean;
  reject_reason: string | null;
  delivery_note: string | null;
  created_at: string;
  paid_at: string | null;
  accepted_at: string | null;
  approved_at: string | null;
  delivered_at: string | null;
  rejected_at: string | null;
  due_at: string | null;
  files: CaseFile[];
}

export interface PaymentStart {
  order_id: string;
  amount: number;
  order_name: string;
  customer_key: string;
  customer_name: string | null;
  customer_phone: string | null;
  client_key: string | null;
  simulated: boolean;
}

export const fmtDate = (s: string | null, withTime = false) =>
  s ? new Date(s).toLocaleString('ko-KR', withTime
    ? { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
    : { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—';

export const fmtSize = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))}KB` : `${(n / 1024 / 1024).toFixed(1)}MB`);

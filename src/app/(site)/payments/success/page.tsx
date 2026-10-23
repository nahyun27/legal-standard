import PaymentSuccess from '@/components/PaymentSuccess';
import { NOINDEX } from '@/lib/seo';

export const metadata = { title: '결제 확인', robots: NOINDEX };

export default async function Page({ searchParams }: PageProps<'/payments/success'>) {
  const q = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
  return <PaymentSuccess caseId={one(q.case)} paymentKey={one(q.paymentKey)} orderId={one(q.orderId)} amount={one(q.amount)} />;
}

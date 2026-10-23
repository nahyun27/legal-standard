import { Suspense } from 'react';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import RouteProgress from '@/components/RouteProgress';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}><RouteProgress /></Suspense>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}

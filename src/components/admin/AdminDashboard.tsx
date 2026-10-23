'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useStaff } from '@/components/admin/AdminShell';
import { AdminHead, PROVIDER, StatusPill } from '@/components/admin/ui';
import { api, fmtDate } from '@/lib/api';
import { won } from '@/lib/format';

interface Stats {
  users: { total: number; onboarded: number; new_7d: number; marketing: number; by_provider: Record<string, number> };
  cases: { by_status: Record<string, number>; open: number; overdue: number; paid_today: number };
  revenue: { today: number; d7: number; total: number };
  kpi: { avg_review_minutes: number | null; reviewed_30d: number; on_time_rate: number | null; delivered_30d: number; followup_rate: number | null; followups: number };
  status_labels: Record<string, string>;
}

interface CaseRow {
  id: number; case_no: string; service_name: string; status: string; status_label: string;
  client_name: string | null; total: number; due_at: string | null; overdue: boolean; lawyer_name: string | null;
}

// 처리해야 할 일 순서(기획서 IX 공정): 수임 검토 → 서면 준비 → 변호사 검수 → 발송
const PIPELINE = ['reviewing', 'in_progress', 'lawyer_review', 'approved'];

export default function AdminDashboard() {
  const staff = useStaff();
  const [s, setS] = useState<Stats | null>(null);
  const [mine, setMine] = useState<CaseRow[]>([]);

  useEffect(() => {
    api<Stats>('/admin/stats').then(setS);
    if (staff.is_lawyer) api<{ items: CaseRow[] }>('/admin/cases?status=open&mine=true').then((r) => setMine(r.items));
  }, [staff.is_lawyer]);

  if (!s) return <div className="spinner" />;

  return (
    <>
      <AdminHead title="대시보드" sub={`${new Date().toLocaleDateString('ko-KR', { dateStyle: 'full' })}`} />

      {s.cases.overdue > 0 && (
        <Link href="/admin/cases?status=open" className="banner banner-warn" style={{ display: 'flex' }}>
          <AlertTriangle size={18} /> 표준 납기를 넘긴 사건이 {s.cases.overdue}건 있습니다.
        </Link>
      )}

      <div className="kpis">
        <div className="kpi"><small>진행 중 사건</small><b>{s.cases.open}</b><span>오늘 결제 {s.cases.paid_today}건</span></div>
        <div className="kpi"><small>오늘 매출</small><b>{won(s.revenue.today)}</b><span>7일 {won(s.revenue.d7)}</span></div>
        <div className="kpi"><small>회원</small><b>{s.users.total.toLocaleString()}</b><span>7일 신규 {s.users.new_7d} · 가입 완료 {s.users.onboarded}</span></div>
        <div className="kpi"><small>누적 매출(환불 제외)</small><b>{won(s.revenue.total)}</b><span>VAT·실비 포함</span></div>
      </div>

      <section className="admin-card">
        <h2>핵심 관리지표 <span className="sub">최근 30일 · 기획서 목표 대비</span></h2>
        <div className="kpis kpis-goal">
          <Goal label="건당 검수시간" value={s.kpi.avg_review_minutes} unit="분" goal="45분 이하" ok={s.kpi.avg_review_minutes !== null && s.kpi.avg_review_minutes <= 45} n={`검수 ${s.kpi.reviewed_30d}건`} />
          <Goal label="납기 준수율" value={s.kpi.on_time_rate} unit="%" goal="95% 이상" ok={s.kpi.on_time_rate !== null && s.kpi.on_time_rate >= 95} n={`완료 ${s.kpi.delivered_30d}건`} />
          <Goal label="다음 단계 전환율" value={s.kpi.followup_rate} unit="%" goal="25% 이상" ok={s.kpi.followup_rate !== null && s.kpi.followup_rate >= 25} n={`후속 결제 ${s.kpi.followups}건`} />
        </div>
      </section>

      <section className="admin-card">
        <h2>처리 대기</h2>
        <div className="pipeline">
          {PIPELINE.map((st) => (
            <Link key={st} href={`/admin/cases?status=${st}`} className="pipe">
              <StatusPill status={st} label={s.status_labels[st]} />
              <b>{s.cases.by_status[st] ?? 0}</b>
            </Link>
          ))}
        </div>
        <p className="sub" style={{ marginTop: 10 }}>
          완료 {s.cases.by_status.delivered ?? 0} · 불성립(환불) {s.cases.by_status.rejected ?? 0} · 결제 대기 {s.cases.by_status.pending_payment ?? 0}
        </p>
      </section>

      {staff.is_lawyer && (
        <section className="admin-card">
          <h2>내 담당 사건</h2>
          {mine.length === 0 ? <p className="sub">진행 중인 담당 사건이 없습니다.</p> : (
            <table className="table admin-table">
              <thead><tr><th>사건번호</th><th>상품</th><th>의뢰인</th><th>상태</th><th>납기</th></tr></thead>
              <tbody>
                {mine.map((c) => (
                  <tr key={c.id}>
                    <td><Link href={`/admin/cases/${c.id}`}>{c.case_no}</Link></td>
                    <td>{c.service_name}</td><td>{c.client_name}</td>
                    <td><StatusPill status={c.status} label={c.status_label} /></td>
                    <td className={c.overdue ? 'overdue' : ''}>{fmtDate(c.due_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {staff.is_admin && (
        <section className="admin-card">
          <h2>회원</h2>
          <div className="mini-stats">
            {Object.entries(s.users.by_provider).map(([k, v]) => <span key={k}>{PROVIDER[k] ?? k} <b>{v}</b></span>)}
            <span>마케팅 수신 동의 <b>{s.users.marketing}</b></span>
          </div>
        </section>
      )}
    </>
  );
}

function Goal({ label, value, unit, goal, ok, n }: { label: string; value: number | null; unit: string; goal: string; ok: boolean; n: string }) {
  return (
    <div className={`kpi ${value === null ? '' : ok ? 'goal-ok' : 'goal-miss'}`}>
      <small>{label}</small>
      <b>{value === null ? '—' : `${value}${unit}`}</b>
      <span>목표 {goal} · {n}</span>
    </div>
  );
}

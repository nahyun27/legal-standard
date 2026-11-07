'use client';

import { useEffect, useState } from 'react';
import { BarList, ColumnChart, MUTED_SERIES, SERIES, SplitBar, TableView, type Point } from '@/components/admin/Charts';
import { AdminHead, PROVIDER } from '@/components/admin/ui';
import { api } from '@/lib/api';
import { won } from '@/lib/format';

interface Report {
  days: number; unit: 'day' | 'week' | 'month';
  totals: { gross: number; refunds: number; net: number; paid_cases: number; avg_order: number | null; signups: number; signups_onboarded: number; rejected: number; avg_lead_days: number | null; delivered: number };
  series: { key: string; revenue: number; charges: number; refunds: number; signups: number; paid_cases: number }[];
  by_service: { slug: string; name: string; count: number; amount: number }[];
  by_track: { track: 'self' | 'atty' | 'other'; count: number; amount: number }[];
  funnel: { key: string; label: string; count: number }[];
  providers: Record<string, number>;
}

const RANGES = [[7, '7일'], [30, '30일'], [90, '90일'], [365, '1년']] as const;
const TRACK = { self: '서면만 받기', atty: '변호사에게 맡기기', other: '단계·장수 상품' } as const;
const UNIT_LABEL = { day: '일별', week: '주별(월요일 시작)', month: '월별' } as const;
const count = (n: number) => `${n.toLocaleString('ko-KR')}건`;
const people = (n: number) => `${n.toLocaleString('ko-KR')}명`;

function labels(key: string, unit: Report['unit']) {
  if (unit === 'month') { const [y, m] = key.split('-'); return { label: `${y}년 ${+m}월`, short: `${+m}월` }; }
  const [, m, d] = key.split('-');
  return { label: unit === 'week' ? `${+m}월 ${+d}일 주` : `${+m}월 ${+d}일`, short: `${+m}/${+d}` };
}

export default function AdminStats() {
  const [days, setDays] = useState(30);
  const [r, setR] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api<Report>(`/admin/stats/report?days=${days}`).then(setR).finally(() => setLoading(false));
  }, [days]);

  if (!r) return <div className="spinner" />;
  const t = r.totals;
  const pts = (pick: (s: Report['series'][number]) => Record<string, number>): Point[] =>
    r.series.map((s) => ({ ...labels(s.key, r.unit), values: pick(s) }));
  const conv = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');

  return (
    <>
      <AdminHead title="통계" sub={`최근 ${days === 365 ? '1년' : `${days}일`} · ${UNIT_LABEL[r.unit]} · 한국 시각 기준`} />

      {/* 기간 — 아래 모든 숫자에 같이 적용된다 */}
      <div className="tabs" role="tablist" aria-label="기간">
        {RANGES.map(([d, l]) => (
          <button key={d} role="tab" aria-selected={days === d} className={days === d ? 'on' : ''} onClick={() => setDays(d)}>{l}</button>
        ))}
      </div>

      <div style={{ opacity: loading ? 0.5 : 1, transition: 'opacity .2s' }}>
        <div className="kpis">
          <div className="kpi"><small>순매출</small><b>{won(t.net)}</b><span>결제 {won(t.gross)} · 환불 {won(t.refunds)}</span></div>
          <div className="kpi"><small>결제 사건</small><b>{t.paid_cases.toLocaleString()}</b><span>건당 평균 {t.avg_order ? won(t.avg_order) : '—'}</span></div>
          <div className="kpi"><small>신규 가입</small><b>{t.signups.toLocaleString()}</b><span>가입 완료 {t.signups_onboarded}명</span></div>
          <div className="kpi"><small>결제→발송 평균</small><b>{t.avg_lead_days ?? '—'}{t.avg_lead_days !== null && <small style={{ fontSize: '.9rem' }}> 일</small>}</b><span>발송 {t.delivered}건 · 불성립 {t.rejected}건</span></div>
        </div>

        <section className="admin-card">
          <h2>매출 <span className="sub">VAT·실비 포함 결제액과 환불액</span></h2>
          <ColumnChart
            points={pts((s) => ({ paid: s.revenue + s.charges, refunds: s.refunds }))}
            series={[{ key: 'paid', label: '결제' }, { key: 'refunds', label: '환불' }]}
            format={won}
          />
          <TableView head={['기간', '결제', '추가 요금', '환불']} rows={r.series.map((s) => [labels(s.key, r.unit).label, won(s.revenue), won(s.charges), won(s.refunds)])} />
        </section>

        <section className="admin-card">
          <h2>가입과 결제 <span className="sub">신규 가입자와 결제된 사건 수</span></h2>
          <ColumnChart
            points={pts((s) => ({ signups: s.signups, paid: s.paid_cases }))}
            series={[{ key: 'signups', label: '신규 가입' }, { key: 'paid', label: '결제 사건' }]}
            format={(n) => n.toLocaleString('ko-KR')}
          />
          <TableView head={['기간', '신규 가입', '결제 사건']} rows={r.series.map((s) => [labels(s.key, r.unit).label, people(s.signups), count(s.paid_cases)])} />
        </section>

        <div className="stats-2">
          <section className="admin-card">
            <h2>접수 흐름 <span className="sub">이 기간에 문진을 제출한 사건 기준</span></h2>
            <BarList
              rows={r.funnel.map((f) => ({ label: f.label, value: f.count }))}
              format={count}
              note={(_, i) => (i ? `앞 단계의 ${conv(r.funnel[i].count, r.funnel[i - 1].count)}` : undefined)}
            />
            <p className="note" style={{ marginTop: 10 }}>결제하지 않고 남은 접수는 7일 뒤 자동 취소됩니다. 불성립 {t.rejected}건은 결제 후 전액 환불된 사건입니다.</p>
          </section>

          <section className="admin-card">
            <h2>방식별 비중 <span className="sub">결제 사건의 본 결제액</span></h2>
            <SplitBar
              parts={(['self', 'atty', 'other'] as const).map((k, i) => ({
                label: TRACK[k], value: r.by_track.find((x) => x.track === k)?.amount ?? 0, color: i < 2 ? SERIES[i] : MUTED_SERIES,
              }))}
              format={won}
            />
            <TableView head={['방식', '건수', '결제액']} rows={r.by_track.map((x) => [TRACK[x.track], count(x.count), won(x.amount)])} />
          </section>
        </div>

        <div className="stats-2">
          <section className="admin-card">
            <h2>상품별 매출 <span className="sub">결제액 순</span></h2>
            <BarList rows={r.by_service.map((s) => ({ label: s.name, value: s.amount, note: count(s.count) }))} format={won} />
          </section>

          <section className="admin-card">
            <h2>가입 경로</h2>
            <BarList
              rows={Object.entries(r.providers).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: PROVIDER[k] ?? k, value: v }))}
              format={people}
            />
          </section>
        </div>
      </div>
    </>
  );
}

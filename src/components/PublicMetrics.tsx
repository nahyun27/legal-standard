'use client';

import { useEffect, useState } from 'react';
import { api, fmtDate } from '@/lib/api';

interface Metrics { available: boolean; delivered?: number; avg_business_days?: number | null; on_time_rate?: number | null; as_of?: string }

/**
 * 실측 지표(처리 건수·평균 처리 영업일·납기 준수율). 사건 데이터에서 서버가 자동 집계하고, 표본이 기준 미만이면 숨는다.
 * 광고 영역이므로 비교·최상급·결과 보장 표현 없이 숫자와 기준일만 보여준다(실적 표시는 객관적 근거 보관 — 기획서 X-3).
 */
export default function PublicMetrics() {
  const [m, setM] = useState<Metrics | null>(null);
  useEffect(() => { api<Metrics>('/public/metrics', {}, false).then(setM).catch(() => setM(null)); }, []);
  if (!m?.available) return null;
  return (
    <div className="metrics-strip">
      <div className="container">
        <span><b>{m.delivered?.toLocaleString()}건</b>발송·제출 완료</span>
        {m.avg_business_days != null && <span><b>{m.avg_business_days}영업일</b>수임 확정부터 평균</span>}
        {m.on_time_rate != null && <span><b>{m.on_time_rate}%</b>표준 납기 준수</span>}
        <small>사건 처리 기록 자동 집계 · {fmtDate(m.as_of ?? null)} 기준</small>
      </div>
    </div>
  );
}

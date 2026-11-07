'use client';

/**
 * 관리자 통계용 가벼운 차트(외부 라이브러리 없이 HTML·CSS). 규칙:
 * - 계열 색은 고정 순서(1 파랑, 2 주황 — 색약 대비 검증 통과), 텍스트는 계열 색을 쓰지 않는다.
 * - 막대는 24px 이하·끝만 4px 둥글게·바닥선에서 자란다. 격자선은 가는 실선.
 * - 막대마다 마우스·키보드 포커스로 값이 뜨고, 같은 값은 "표로 보기"에서도 볼 수 있다.
 */
import { useState } from 'react';

export const SERIES = ['#2a78d6', '#eb6834'] as const;
export const MUTED_SERIES = '#9aa1b2';

export interface Series { key: string; label: string }
export interface Point { label: string; short: string; values: Record<string, number> }

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

const compact = (n: number) =>
  n >= 100_000_000 ? `${+(n / 100_000_000).toFixed(1)}억` : n >= 10_000 ? `${+(n / 10_000).toFixed(n >= 1_000_000 ? 0 : 1)}만` : n.toLocaleString('ko-KR');

/** 시간축 막대(1~2계열). 계열이 둘이면 범례를 같이 그린다. */
export function ColumnChart({ points, series, format, axisFormat = compact, height = 180, emptyText = '이 기간에 데이터가 없습니다.' }: {
  points: Point[]; series: Series[]; format: (n: number) => string; axisFormat?: (n: number) => string; height?: number; emptyText?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...points.flatMap((p) => series.map((s) => p.values[s.key] ?? 0))));
  const ticks = [0, 0.5, 1].map((f) => max * f);
  const empty = points.every((p) => series.every((s) => !p.values[s.key]));
  // 라벨은 많으면 듬성듬성(첫·끝 포함 약 7개)
  const every = Math.max(1, Math.ceil(points.length / 7));

  return (
    <div className="vz">
      {series.length > 1 && (
        <div className="vz-legend">
          {series.map((s, i) => <span key={s.key}><i style={{ background: SERIES[i] }} />{s.label}</span>)}
        </div>
      )}
      <div className="vz-plot" style={{ height }}>
        <div className="vz-grid" aria-hidden="true">
          {ticks.slice().reverse().map((t) => <div key={t}><span>{axisFormat(t)}</span></div>)}
        </div>
        {empty && <p className="vz-empty">{emptyText}</p>}
        <div className="vz-cols" onMouseLeave={() => setHover(null)}>
          {points.map((p, i) => (
            <div
              key={p.label}
              className={`vz-col${hover === i ? ' on' : ''}`}
              tabIndex={0}
              aria-label={`${p.label} ${series.map((s) => `${s.label} ${format(p.values[s.key] ?? 0)}`).join(', ')}`}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
            >
              <div className="vz-bars">
                {series.map((s, si) => {
                  const v = p.values[s.key] ?? 0;
                  return <span key={s.key} style={{ height: `${(v / max) * 100}%`, background: SERIES[si], minHeight: v > 0 ? 2 : 0 }} />;
                })}
              </div>
              {hover === i && (
                <div className={`vz-tip${i > points.length * 0.66 ? ' left' : ''}`} role="status">
                  <small>{p.label}</small>
                  {series.map((s, si) => (
                    <div key={s.key}><i style={{ background: SERIES[si] }} /><b>{format(p.values[s.key] ?? 0)}</b>{series.length > 1 && <span>{s.label}</span>}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="vz-x" aria-hidden="true">
        {points.map((p, i) => <span key={p.label}>{i % every === 0 || i === points.length - 1 ? p.short : ''}</span>)}
      </div>
    </div>
  );
}

/** 가로 막대 목록(상품별·접수 흐름). 값은 막대 끝에 쓴다. */
export function BarList({ rows, format, note }: {
  rows: { label: string; value: number; note?: string }[]; format: (n: number) => string; note?: (r: { value: number }, i: number) => string | undefined;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="vz-empty static">이 기간에 데이터가 없습니다.</p>;
  return (
    <ul className="vz-barlist">
      {rows.map((r, i) => (
        <li key={r.label} tabIndex={0} aria-label={`${r.label} ${format(r.value)}`}>
          <span className="lbl">{r.label}</span>
          <span className="trk"><span style={{ width: `${(r.value / max) * 100}%`, background: SERIES[0], minWidth: r.value > 0 ? 3 : 0 }} /></span>
          <span className="val">{format(r.value)}{(r.note ?? note?.(r, i)) && <small>{r.note ?? note?.(r, i)}</small>}</span>
        </li>
      ))}
    </ul>
  );
}

/** 하나의 전체를 나눈 막대(방식별 비중). 범례가 항상 같이 나온다. */
export function SplitBar({ parts, format }: { parts: { label: string; value: number; color: string }[]; format: (n: number) => string }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  if (!total) return <p className="vz-empty static">이 기간에 데이터가 없습니다.</p>;
  return (
    <div className="vz">
      <div className="vz-split" role="img" aria-label={parts.map((p) => `${p.label} ${format(p.value)}`).join(', ')}>
        {parts.filter((p) => p.value > 0).map((p) => (
          <span key={p.label} style={{ flexGrow: p.value, background: p.color }} title={`${p.label} ${format(p.value)} (${Math.round((p.value / total) * 100)}%)`} />
        ))}
      </div>
      <div className="vz-legend">
        {parts.map((p) => (
          <span key={p.label}><i style={{ background: p.color }} />{p.label} <b>{format(p.value)}</b> <small>{Math.round((p.value / total) * 100)}%</small></span>
        ))}
      </div>
    </div>
  );
}

/** 차트 아래 접는 표 — 색·마우스 없이도 모든 값을 읽을 수 있게. */
export function TableView({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <details className="vz-table">
      <summary>표로 보기</summary>
      <div className="table-wrap">
        <table className="table admin-table">
          <thead><tr>{head.map((h, i) => <th key={h} className={i ? 'num' : ''}>{h}</th>)}</tr></thead>
          <tbody>{rows.map((r) => <tr key={String(r[0])}>{r.map((c, i) => <td key={i} className={i ? 'num' : ''}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </details>
  );
}

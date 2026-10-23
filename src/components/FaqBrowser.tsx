'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { glossed } from '@/components/Glossed';
import { FAQ } from '@/data/faq';

// FAQ 분류 — 질문 문구로 나눈다(데이터에 분류를 넣지 않고 한 곳에서 관리)
const CATS: { key: string; label: string; match: (q: string) => boolean }[] = [
  { key: 'all', label: '전체', match: () => true },
  { key: 'price', label: '가격·비용', match: (q) => /가격|비용|수임료|저렴|낮은/.test(q) },
  { key: 'process', label: '진행', match: (q) => /진행|이의|사건이 커지|어려운/.test(q) },
  { key: 'doc', label: '서면', match: (q) => /서면|작성/.test(q) },
  { key: 'privacy', label: '개인정보', match: (q) => /정보/.test(q) },
];

export default function FaqBrowser() {
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const items = useMemo(() => {
    const c = CATS.find((x) => x.key === cat)!;
    const term = q.trim();
    return FAQ.filter((f) => c.match(f.q) && (!term || f.q.includes(term) || f.a.includes(term)));
  }, [cat, q]);
  return (
    <div className="faq-browser">
      <div className="faq-tools">
        <div className="seg-tabs" role="tablist">
          {CATS.map((c) => <button key={c.key} role="tab" aria-selected={cat === c.key} className={cat === c.key ? 'on' : ''} onClick={() => setCat(c.key)}>{c.label}</button>)}
        </div>
        <label className="faq-search">
          <Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="궁금한 내용을 검색하세요" />
        </label>
      </div>
      <div key={cat + q} className="faq-list">
        {items.length === 0 ? <p className="sub" style={{ padding: '24px 0' }}>찾는 질문이 없습니다. 다른 말로 검색해 보세요.</p>
          : items.map((f) => (
            <details key={f.q} className="faq">
              <summary>{f.q}</summary>
              <p>{glossed(f.a)}</p>
            </details>
          ))}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Reveal from '@/components/Reveal';
import { ServiceCard } from '@/components/ui';
import { CATEGORY_LABEL, SERVICES } from '@/data/services';
import type { Category } from '@/data/types';

const TABS: { key: Category | 'all'; label: string }[] = [
  { key: 'all', label: '전체' },
  ...(Object.entries(CATEGORY_LABEL) as [Category, string][]).map(([key, label]) => ({ key, label })),
];

/** 상황별 탭 + 진열 카드. 접수 가능한 상품을 앞에, 오픈 예정 상품은 뒤에 흐리게 둔다. */
export default function ServicesBrowser() {
  const [tab, setTab] = useState<Category | 'all'>('all');
  const items = SERVICES.filter((s) => tab === 'all' || s.category === tab)
    .sort((a, b) => Number(a.stage !== 'pilot') - Number(b.stage !== 'pilot'));
  return (
    <>
      <div className="seg-tabs" role="tablist" aria-label="상황별 보기">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>
            {t.label}
            <small>{t.key === 'all' ? SERVICES.length : SERVICES.filter((s) => s.category === t.key).length}</small>
          </button>
        ))}
      </div>
      {/* key 로 탭이 바뀔 때마다 카드를 다시 그려 등장 애니메이션을 준다 */}
      <div key={tab} className="grid grid-3 shelf shelf-anim">
        {items.map((s, i) => (
          <Reveal key={s.slug} delay={Math.min(i, 5) * 60} className={s.stage === 'pilot' ? '' : 'is-upcoming'}>
            <ServiceCard service={s} />
          </Reveal>
        ))}
      </div>
    </>
  );
}

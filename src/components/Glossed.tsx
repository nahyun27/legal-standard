import { Fragment } from 'react';
import Term from '@/components/Term';
import { GLOSSARY } from '@/data/glossary';

// 표기 → 풀이. 긴 표기부터 찾아야 "압류 및 추심"이 "압류"보다 먼저 잡힌다.
const FORMS = GLOSSARY.flatMap((g) => [g.term, ...(g.aliases ?? [])].map((form) => ({ form, entry: g })))
  .sort((a, b) => b.form.length - a.form.length);
const PATTERN = new RegExp(FORMS.map((f) => f.form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
const BY_FORM = new Map(FORMS.map((f) => [f.form, f.entry]));

/**
 * 문장 속 법률 용어를 풀이 말풍선(Term)으로 감싼다. 같은 용어는 처음 한 번만 감싼다.
 * 여러 문장(목록 항목 등)에 걸쳐 한 번만 감싸려면 같은 seen 을 넘긴다.
 * 링크(<a>) 안의 문장에는 쓰지 않는다 — 버튼을 링크 안에 넣을 수 없다.
 */
export function glossed(text: string, seen: Set<string> = new Set()): React.ReactNode {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(PATTERN)) {
    const entry = BY_FORM.get(m[0])!;
    if (seen.has(entry.term)) continue;
    seen.add(entry.term);
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(<Term key={m.index} body={entry.body}>{m[0]}</Term>);
    last = m.index + m[0].length;
  }
  if (!out.length) return text;
  out.push(text.slice(last));
  return out.map((n, i) => <Fragment key={i}>{n}</Fragment>);
}

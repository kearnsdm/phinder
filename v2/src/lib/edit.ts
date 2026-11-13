// Changes to a search (add, remove, join, split) and its plain-language description.
// Every function returns a new Query; none changes its argument.

import { gpcLabel, type Dataset } from './dataset';
import { affixById } from './morph';
import type { Notation } from './phonemeMeta';
import { defaultFilters, type Criterion, type Filters, type GroupName, type Position, type Query } from './query';
import { unitLabel, unitShape } from './units';

/** The rows of "3 Sound Spellings Selected". "taught" is the list of known sound spellings. */
export type Row = GroupName | 'taught';

const sameCriterion = (a: Criterion, b: Criterion): boolean =>
  a.type === 'unit' && b.type === 'unit'
    ? a.gpcs.length === b.gpcs.length && a.gpcs.every((id, k) => id === b.gpcs[k])
    : a.type === 'affix' && b.type === 'affix' && a.affix === b.affix;

export function addCriterion(q: Query, row: Row, c: Criterion): Query {
  if (row === 'taught') {
    if (c.type !== 'unit') return addCriterion(q, 'all', c);
    const taught = [...q.taught];
    for (const id of c.gpcs) if (!taught.includes(id)) taught.push(id);
    return { ...q, taught };
  }
  if (q[row].some((x) => sameCriterion(x, c))) return q;
  return { ...q, [row]: [...q[row], c] };
}

export const addGpc = (q: Query, row: Row, id: number): Query =>
  addCriterion(q, row, { type: 'unit', gpcs: [id], position: 'any' });

export const addAffix = (q: Query, row: Row, affix: string): Query =>
  addCriterion(q, row, { type: 'affix', affix, keepsSound: true });

export function removeAt(q: Query, row: Row, index: number): Query {
  if (row === 'taught') return { ...q, taught: q.taught.filter((_, k) => k !== index) };
  return { ...q, [row]: q[row].filter((_, k) => k !== index) };
}

function replaceAt(q: Query, row: GroupName, index: number, next: Criterion[]): Query {
  const list = [...q[row]];
  list.splice(index, 1, ...next);
  return { ...q, [row]: list };
}

/** Joins the unit at `index` with the one after it: the two must then be next to each other in a word. */
export function joinWithNext(q: Query, row: GroupName, index: number): Query {
  const a = q[row][index];
  const b = q[row][index + 1];
  if (!a || !b || a.type !== 'unit' || b.type !== 'unit') return q;
  const position: Position = a.position === 'start' ? 'start' : b.position === 'end' ? 'end' : 'any';
  const list = [...q[row]];
  list.splice(index, 2, { type: 'unit', gpcs: [...a.gpcs, ...b.gpcs], position });
  return { ...q, [row]: list };
}

/** Undoes a join: each sound spelling becomes its own unit again. */
export function splitUnit(q: Query, row: GroupName, index: number): Query {
  const c = q[row][index];
  if (!c || c.type !== 'unit' || c.gpcs.length < 2) return q;
  return replaceAt(
    q,
    row,
    index,
    c.gpcs.map((id) => ({ type: 'unit', gpcs: [id], position: 'any' }) as Criterion),
  );
}

export function setPosition(q: Query, row: GroupName, index: number, position: Position): Query {
  const c = q[row][index];
  return c && c.type === 'unit' ? replaceAt(q, row, index, [{ ...c, position }]) : q;
}

export function setKeepsSound(q: Query, row: GroupName, index: number, keepsSound: boolean): Query {
  const c = q[row][index];
  return c && c.type === 'affix' ? replaceAt(q, row, index, [{ ...c, keepsSound }]) : q;
}

// ---- labels ----------------------------------------------------------------

const POSITION_TEXT: Record<Position, string> = { any: '', start: 'at the start', middle: 'in the middle', end: 'at the end' };

export function criterionLabel(ds: Dataset, c: Criterion, notation: Notation): string {
  if (c.type === 'affix') return affixById.get(c.affix)?.label ?? c.affix;
  return unitLabel(
    c.gpcs.map((id) => ds.gpcs[id]),
    notation,
  );
}

/** A short tag under a chip: "rime", "body", "start", "end", "prefix", "suffix". */
export function criterionTags(ds: Dataset, c: Criterion): string[] {
  if (c.type === 'affix') {
    const def = affixById.get(c.affix);
    return [def?.kind ?? 'word part', ...(c.keepsSound ? [] : ['any base sound'])];
  }
  const tags: string[] = [];
  const shape = unitShape(c.gpcs.map((id) => ds.gpcs[id]));
  if (shape === 'rime' || shape === 'body') tags.push(shape);
  if (c.position === 'start') tags.push('start of word');
  if (c.position === 'middle') tags.push('middle of word');
  if (c.position === 'end') tags.push('end of word');
  return tags;
}

const rangeText = (min: number | null, max: number | null, one: string, many: string): string | null => {
  if (min === null && max === null) return null;
  if (min !== null && max !== null) return min === max ? `${min} ${min === 1 ? one : many}` : `${min} to ${max} ${many}`;
  if (max !== null) return `up to ${max} ${max === 1 ? one : many}`;
  return `${min} or more ${many}`;
};

export function filterSummary(f: Filters, wordSet: Query['wordSet']): string[] {
  const out: string[] = [];
  const syl = rangeText(f.syllablesMin, f.syllablesMax, 'syllable', 'syllables');
  const let_ = rangeText(f.lettersMin, f.lettersMax, 'letter', 'letters');
  if (syl) out.push(syl);
  if (let_) out.push(let_);
  if (f.frequencyMin !== null && f.frequencyMax !== null) out.push(`frequency ${f.frequencyMin} to ${f.frequencyMax}`);
  else if (f.frequencyMin !== null) out.push(`frequency ${f.frequencyMin} or higher`);
  else if (f.frequencyMax !== null) out.push(`frequency ${f.frequencyMax} or lower`);
  else if (wordSet === 'freq') out.push('only words with a frequency value');
  return out;
}

export const sameFilters = (a: Filters, b: Filters): boolean => (Object.keys(a) as (keyof Filters)[]).every((k) => a[k] === b[k]);

export const filtersAreDefault = (f: Filters): boolean => sameFilters(f, defaultFilters());

/** One sentence that says what the search asks for. Used on printed lists. */
export function describeQuery(ds: Dataset, q: Query, notation: Notation): string {
  const name = (c: Criterion) => {
    const text = criterionLabel(ds, c, notation);
    return c.type === 'unit' && c.position !== 'any' ? `${text} ${POSITION_TEXT[c.position]}` : text;
  };
  const parts: string[] = [];
  if (q.all.length) parts.push(`with ${q.all.map(name).join(' and ')}`);
  if (q.any.length) parts.push(`with ${q.any.length > 1 ? 'at least one of ' : ''}${q.any.map(name).join(', ')}`);
  if (q.none.length) parts.push(`without ${q.none.map(name).join(' or ')}`);
  if (q.decodable) {
    parts.push(
      `made only from known sound spellings (${q.taught.map((id) => gpcLabel(ds.gpcs[id], notation)).join(', ') || 'none listed'})`,
    );
  }
  const limits = filterSummary(q.filters, q.wordSet);
  return `Words ${parts.join('; ') || '(no sound spellings selected)'}${limits.length ? `. Limits: ${limits.join(', ')}.` : '.'}`;
}

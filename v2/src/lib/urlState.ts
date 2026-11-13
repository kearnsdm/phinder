// Share links. The whole search is written into the part of the address after
// "#", so a link reopens the same search. Sound spellings are stored by name
// ("ea_i"), not by number, so links keep working when the word data changes.
//
// Position flags: :s start, :m middle, :e end.
// "tab" names the tab of the word-list screen (family, decodable, parts).
// Example: #all=ea_i,a-e_e+k_k:e&dec=1&taught=m_m,a_a&syl=1-2&sort=alpha-asc

import type { Dataset } from './dataset';
import { affixById } from './morph';
import type { Notation } from './phonemeMeta';
import {
  defaultFilters,
  emptyQuery,
  SORTS,
  type Criterion,
  type Filters,
  type Query,
  type SortKey,
} from './query';

export type View = 'find' | 'explore';

/**
 * The tab of the word-list screen. "find" and "parts" are two ways into the
 * same search; "family" and "decodable" each keep a search of their own.
 */
export type Task = 'find' | 'parts' | 'family' | 'decodable';
const TASKS: Task[] = ['find', 'parts', 'family', 'decodable'];

export interface AppState {
  view: View;
  task: Task;
  /** The search of the tab named by `task`. */
  query: Query;
  sort: SortKey;
  notation: Notation;
  /** The word shown on the Explore screen. */
  exploreWord: string;
}

export const defaultState = (): AppState => ({
  view: 'find',
  task: 'find',
  query: { ...emptyQuery(), filters: defaultFilters() },
  sort: 'freq-desc',
  notation: 'sc',
  exploreWord: '',
});

const enc = encodeURIComponent;

function encodeCriterion(ds: Dataset, c: Criterion): string {
  if (c.type === 'affix') return `*${enc(c.affix)}${c.keepsSound ? '' : ':x'}`;
  const keys = c.gpcs.map((id) => enc(ds.gpcs[id].key)).join('+');
  const flag = { any: '', start: ':s', middle: ':m', end: ':e' }[c.position];
  return keys + flag;
}

function decodeCriterion(ds: Dataset, text: string): Criterion | null {
  const [body, flag] = text.split(':');
  if (body.startsWith('*')) {
    const affix = decodeURIComponent(body.slice(1));
    return affixById.has(affix) ? { type: 'affix', affix, keepsSound: flag !== 'x' } : null;
  }
  const gpcs: number[] = [];
  for (const part of body.split('+')) {
    const g = ds.gpcByKey.get(decodeURIComponent(part));
    if (!g) return null;
    gpcs.push(g.id);
  }
  if (gpcs.length === 0) return null;
  const position = flag === 's' ? 'start' : flag === 'm' ? 'middle' : flag === 'e' ? 'end' : 'any';
  return { type: 'unit', gpcs, position };
}

/** "1-4", "-10" (no minimum), "-" (no limit); null when the range is the default. */
const range = (min: number | null, max: number | null, dMin: number | null, dMax: number | null): string | null =>
  min === dMin && max === dMax ? null : `${min ?? ''}-${max ?? ''}`;

function parseRange(
  text: string | undefined,
  dMin: number | null,
  dMax: number | null,
): [number | null, number | null] {
  if (!text) return [dMin, dMax];
  const at = text.indexOf('-');
  const num = (s: string) => (s === '' || Number.isNaN(Number(s)) ? null : Number(s));
  if (at < 0) return num(text) === null ? [dMin, dMax] : [num(text), num(text)];
  return [num(text.slice(0, at)), num(text.slice(at + 1))];
}

export function encodeState(ds: Dataset, state: AppState): string {
  const { query: q } = state;
  const parts: string[] = [];
  const add = (key: string, value: string | null) => {
    if (value !== null && value !== '') parts.push(`${key}=${value}`);
  };
  if (state.view !== 'find') add('view', state.view);
  if (state.task !== 'find') add('tab', state.task);
  if (state.exploreWord) add('word', enc(state.exploreWord));
  for (const group of ['all', 'any', 'none'] as const) {
    add(group, q[group].map((c) => encodeCriterion(ds, c)).join(','));
  }
  if (q.decodable) add('dec', '1');
  add('taught', q.taught.map((id) => enc(ds.gpcs[id].key)).join(','));
  if (q.wordSet !== 'all') add('set', q.wordSet);
  const f = q.filters;
  const d = defaultFilters();
  add('syl', range(f.syllablesMin, f.syllablesMax, d.syllablesMin, d.syllablesMax));
  add('let', range(f.lettersMin, f.lettersMax, d.lettersMin, d.lettersMax));
  add('freq', range(f.frequencyMin, f.frequencyMax, d.frequencyMin, d.frequencyMax));
  if (state.sort !== 'freq-desc') add('sort', state.sort);
  if (state.notation !== 'sc') add('n', state.notation);
  return parts.join('&');
}

export function decodeState(ds: Dataset, hash: string): AppState {
  const state = defaultState();
  const params = new Map<string, string>();
  for (const part of hash.replace(/^#/, '').split('&')) {
    const at = part.indexOf('=');
    if (at > 0) params.set(part.slice(0, at), part.slice(at + 1));
  }
  const safe = <T>(fn: () => T, fallback: T): T => {
    try {
      return fn();
    } catch {
      return fallback; // a damaged link (bad percent-encoding) falls back to defaults
    }
  };

  if (params.get('view') === 'explore') state.view = 'explore';
  const tab = params.get('tab') as Task | undefined;
  if (tab && TASKS.includes(tab)) state.task = tab;
  state.exploreWord = safe(() => decodeURIComponent(params.get('word') ?? ''), '');

  const q = state.query;
  for (const group of ['all', 'any', 'none'] as const) {
    const text = params.get(group);
    if (!text) continue;
    q[group] = text
      .split(',')
      .map((c) => safe(() => decodeCriterion(ds, c), null))
      .filter((c): c is Criterion => c !== null);
  }
  q.decodable = params.get('dec') === '1' || state.task === 'decodable';
  const taught = params.get('taught');
  if (taught) {
    const ids = taught.split(',').map((k) => safe(() => ds.gpcByKey.get(decodeURIComponent(k))?.id, undefined));
    q.taught = [...new Set(ids.filter((id): id is number => id !== undefined))];
  }
  if (params.get('set') === 'freq') q.wordSet = 'freq';
  const filters: Filters = defaultFilters();
  const d = defaultFilters();
  [filters.syllablesMin, filters.syllablesMax] = parseRange(params.get('syl'), d.syllablesMin, d.syllablesMax);
  [filters.lettersMin, filters.lettersMax] = parseRange(params.get('let'), d.lettersMin, d.lettersMax);
  [filters.frequencyMin, filters.frequencyMax] = parseRange(params.get('freq'), d.frequencyMin, d.frequencyMax);
  q.filters = filters;

  const sort = params.get('sort');
  if (sort && SORTS.some((s) => s.key === sort)) state.sort = sort as SortKey;
  if (params.get('n') === 'ipa') state.notation = 'ipa';
  return state;
}

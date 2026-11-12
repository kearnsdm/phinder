// The shape of a search, shared by the search engine, the screens, and share links.

import type { WordSet } from './stats';

/** 'middle' = not the first and not the last sound spelling of the word. */
export type Position = 'any' | 'start' | 'middle' | 'end';

/** One sound spelling, or several that must be next to each other in this order. */
export interface UnitCriterion {
  type: 'unit';
  /** Sound-spelling ids (Dataset.gpcs indexes). */
  gpcs: number[];
  position: Position;
}

/** A prefix or suffix (see morph.ts). */
export interface AffixCriterion {
  type: 'affix';
  affix: string;
  /** true: include only words whose base word keeps its pronunciation. */
  keepsSound: boolean;
}

export type Criterion = UnitCriterion | AffixCriterion;

export type GroupName = 'all' | 'any' | 'none';

export interface Filters {
  syllablesMin: number | null;
  syllablesMax: number | null;
  lettersMin: number | null;
  lettersMax: number | null;
  frequencyMin: number | null;
  frequencyMax: number | null;
}

export interface Query {
  /** A word must match every one of these. */
  all: Criterion[];
  /** If not empty, a word must match at least one of these. */
  any: Criterion[];
  /** A word must match none of these. */
  none: Criterion[];
  /** true: every sound spelling in the word must be on the taught list (or named in `all` / `any`). */
  decodable: boolean;
  taught: number[];
  wordSet: WordSet;
  filters: Filters;
}

export const emptyFilters = (): Filters => ({
  syllablesMin: null,
  syllablesMax: null,
  lettersMin: null,
  lettersMax: null,
  frequencyMin: null,
  frequencyMax: null,
});

/** The limits Phinder has always started with: up to 4 syllables and 10 letters. */
export const defaultFilters = (): Filters => ({ ...emptyFilters(), syllablesMax: 4, lettersMax: 10 });

export const emptyQuery = (): Query => ({
  all: [],
  any: [],
  none: [],
  decodable: false,
  taught: [],
  wordSet: 'all',
  filters: emptyFilters(),
});

/** A search needs something to look for before it can return words. */
export const hasCriteria = (q: Query): boolean =>
  q.all.length > 0 || q.any.length > 0 || (q.decodable && q.taught.length > 0);


export type SortKey = 'freq-desc' | 'freq-asc' | 'alpha-asc' | 'alpha-desc' | 'length-asc' | 'length-desc';

export const SORTS: { key: SortKey; label: string }[] = [
  { key: 'freq-desc', label: 'Frequency ▾' },
  { key: 'freq-asc', label: 'Frequency ▴' },
  { key: 'alpha-asc', label: 'Alphabetical ▾' },
  { key: 'alpha-desc', label: 'Alphabetical ▴' },
  { key: 'length-asc', label: 'Length ▾' },
  { key: 'length-desc', label: 'Length ▴' },
];

// The search engine. It scans every word once and keeps the words that meet
// the query. All matching is on whole sound spellings.

import { seqOf, wordShape, type Dataset } from './dataset';
import type { Morph } from './morph';
import { hasCriteria, type Criterion, type Query, type SortKey } from './query';

type Test = (i: number, seq: string) => boolean;

function compileCriterion(ds: Dataset, c: Criterion, morph: Morph | null): Test {
  if (c.type === 'unit') {
    const s = seqOf(ds, c.gpcs);
    if (s === '') return () => false;
    if (c.position === 'start') return (_i, seq) => seq.startsWith(s);
    if (c.position === 'end') return (_i, seq) => seq.endsWith(s);
    if (c.position === 'middle') {
      // The first match after the start of the word must stop before its end.
      return (_i, seq) => {
        const at = seq.indexOf(s, 1);
        return at !== -1 && at + s.length < seq.length;
      };
    }
    return (_i, seq) => seq.includes(s);
  }
  if (!morph) return () => false;
  const hits = morph.hitsByWord(c.affix);
  if (c.keepsSound) return (i) => hits.get(i)?.keepsSound === true;
  return (i) => hits.has(i);
}

/** Every sound spelling a decodable search accepts: the taught list plus those named in the search itself. */
export function allowedGpcs(q: Query): Set<number> {
  const allowed = new Set(q.taught);
  for (const c of [...q.all, ...q.any]) if (c.type === 'unit') c.gpcs.forEach((id) => allowed.add(id));
  return allowed;
}

type Limits = Pick<Query, 'wordSet' | 'filters' | 'shape'>;

/** The tests that do not depend on what was selected: the word set, the limits in Options, and the word shape. */
export function limitsTest(ds: Dataset, q: Limits): (i: number) => boolean {
  const f = q.filters;
  const freqOnly = q.wordSet === 'freq' || f.frequencyMin !== null || f.frequencyMax !== null;
  return (i) => {
    const freq = ds.freq[i];
    if (freqOnly && Number.isNaN(freq)) return false;
    if (f.frequencyMin !== null && freq < f.frequencyMin) return false;
    if (f.frequencyMax !== null && freq > f.frequencyMax) return false;
    const syl = ds.syllables[i];
    if (f.syllablesMin !== null && syl < f.syllablesMin) return false;
    if (f.syllablesMax !== null && syl > f.syllablesMax) return false;
    const len = ds.letters[i];
    if (f.lettersMin !== null && len < f.lettersMin) return false;
    if (f.lettersMax !== null && len > f.lettersMax) return false;
    return q.shape === null || wordShape(ds, i) === q.shape;
  };
}

/**
 * For each sound spelling, the number of words within the limits that
 * contain it. The grids use it to leave out sound spellings that would give
 * an empty list.
 */
export function wordsPerGpc(ds: Dataset, q: Limits): Uint32Array {
  const counts = new Uint32Array(ds.gpcs.length);
  const lastSeen = new Int32Array(ds.gpcs.length).fill(-1);
  const withinLimits = limitsTest(ds, q);
  for (let i = 0; i < ds.n; i++) {
    if (!withinLimits(i)) continue;
    const seq = ds.seq[i];
    for (let k = 0; k < seq.length; k++) {
      const id = seq.charCodeAt(k) - ds.charBase;
      if (lastSeen[id] !== i) {
        lastSeen[id] = i;
        counts[id]++;
      }
    }
  }
  return counts;
}

/** Returns the indexes of matching words, in word-list order. */
export function search(ds: Dataset, q: Query, morph: Morph | null = null): number[] {
  if (!hasCriteria(q)) return [];

  const all = q.all.map((c) => compileCriterion(ds, c, morph));
  const any = q.any.map((c) => compileCriterion(ds, c, morph));
  const none = q.none.map((c) => compileCriterion(ds, c, morph));

  let allowed: Uint8Array | null = null;
  if (q.decodable) {
    allowed = new Uint8Array(ds.gpcs.length);
    for (const id of allowedGpcs(q)) allowed[id] = 1;
  }

  const withinLimits = limitsTest(ds, q);
  const out: number[] = [];

  words: for (let i = 0; i < ds.n; i++) {
    if (!withinLimits(i)) continue;

    const seq = ds.seq[i];
    for (const test of all) if (!test(i, seq)) continue words;
    for (const test of none) if (test(i, seq)) continue words;
    if (any.length > 0) {
      let found = false;
      for (const test of any) {
        if (test(i, seq)) {
          found = true;
          break;
        }
      }
      if (!found) continue;
    }
    if (allowed) {
      for (let k = 0; k < seq.length; k++) {
        if (!allowed[seq.charCodeAt(k) - ds.charBase]) continue words;
      }
    }
    out.push(i);
  }
  return out;
}

/** Sorts in place. Words without a frequency value go last in both frequency orders. */
export function sortResults(ds: Dataset, indexes: number[], sort: SortKey): number[] {
  const { word, freq, letters } = ds;
  const alpha = (a: number, b: number) => (word[a] < word[b] ? -1 : word[a] > word[b] ? 1 : 0);
  const byFreq = (dir: 1 | -1) => (a: number, b: number) => {
    const fa = freq[a];
    const fb = freq[b];
    const na = Number.isNaN(fa);
    const nb = Number.isNaN(fb);
    if (na || nb) return na && nb ? alpha(a, b) : na ? 1 : -1;
    return dir * (fa - fb) || alpha(a, b);
  };
  switch (sort) {
    case 'freq-desc':
      return indexes.sort(byFreq(-1));
    case 'freq-asc':
      return indexes.sort(byFreq(1));
    case 'alpha-asc':
      return indexes.sort(alpha);
    case 'alpha-desc':
      return indexes.sort((a, b) => alpha(b, a));
    case 'length-asc':
      return indexes.sort((a, b) => letters[a] - letters[b] || alpha(a, b));
    case 'length-desc':
      return indexes.sort((a, b) => letters[b] - letters[a] || alpha(a, b));
  }
}

/**
 * For one word, the positions (indexes into its sound spellings) matched by
 * the unit criteria. Used to highlight the match in the word list.
 */
export function matchedPositions(ds: Dataset, seq: string, criteria: Criterion[]): Set<number> {
  const hit = new Set<number>();
  for (const c of criteria) {
    if (c.type !== 'unit') continue;
    const s = seqOf(ds, c.gpcs);
    if (s === '') continue;
    const mark = (at: number) => {
      for (let k = 0; k < s.length; k++) hit.add(at + k);
    };
    if (c.position === 'start') {
      if (seq.startsWith(s)) mark(0);
    } else if (c.position === 'end') {
      if (seq.endsWith(s)) mark(seq.length - s.length);
    } else {
      const middle = c.position === 'middle';
      for (let at = seq.indexOf(s); at !== -1; at = seq.indexOf(s, at + 1)) {
        if (!middle || (at > 0 && at + s.length < seq.length)) mark(at);
      }
    }
  }
  return hit;
}

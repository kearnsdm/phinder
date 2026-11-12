// Counts of how often each sound spelling occurs, and the consistency of each
// mapping in both directions:
//   reading consistency  = of all occurrences of a grapheme, the share with this sound
//   spelling consistency = of all occurrences of a sound, the share with this grapheme
// Counts can be plain (every word counts once per occurrence) or weighted by
// word frequency (only words with a frequency value contribute).

import type { Dataset } from './dataset';

export type WordSet = 'all' | 'freq';
export type Weight = 'words' | 'freq';

interface Total {
  occ: number;
  occFreq: number;
  /** Sound spellings in this group, most common first. */
  gpcs: number[];
}

export interface Stats {
  wordSet: WordSet;
  nWords: number;
  /** Occurrences of each sound spelling across the word set. */
  occ: Float64Array;
  /** Occurrences weighted by word frequency. */
  occFreq: Float64Array;
  /** Number of words that contain the sound spelling at least once. */
  words: Uint32Array;
  byGrapheme: Map<string, Total>;
  byPhoneme: Total[];
}

export function computeStats(ds: Dataset, wordSet: WordSet): Stats {
  const G = ds.gpcs.length;
  const occ = new Float64Array(G);
  const occFreq = new Float64Array(G);
  const words = new Uint32Array(G);
  const lastSeen = new Int32Array(G).fill(-1);
  let nWords = 0;

  for (let i = 0; i < ds.n; i++) {
    const f = ds.freq[i];
    const hasFreq = !Number.isNaN(f);
    if (wordSet === 'freq' && !hasFreq) continue;
    nWords++;
    const seq = ds.seq[i];
    for (let k = 0; k < seq.length; k++) {
      const id = seq.charCodeAt(k) - ds.charBase;
      occ[id]++;
      if (hasFreq) occFreq[id] += f;
      if (lastSeen[id] !== i) {
        lastSeen[id] = i;
        words[id]++;
      }
    }
  }

  const byGrapheme = new Map<string, Total>();
  const byPhoneme: Total[] = ds.phonemes.map(() => ({ occ: 0, occFreq: 0, gpcs: [] }));
  for (const g of ds.gpcs) {
    if (occ[g.id] === 0) continue;
    let t = byGrapheme.get(g.grapheme);
    if (!t) byGrapheme.set(g.grapheme, (t = { occ: 0, occFreq: 0, gpcs: [] }));
    for (const total of [t, byPhoneme[g.phoneme.index]]) {
      total.occ += occ[g.id];
      total.occFreq += occFreq[g.id];
      total.gpcs.push(g.id);
    }
  }
  const byCount = (a: number, b: number) => occ[b] - occ[a] || a - b;
  byGrapheme.forEach((t) => t.gpcs.sort(byCount));
  byPhoneme.forEach((t) => t.gpcs.sort(byCount));

  return { wordSet, nWords, occ, occFreq, words, byGrapheme, byPhoneme };
}

const share = (part: number, whole: number): number => (whole > 0 ? part / whole : NaN);

/** Of all occurrences of this grapheme, the share pronounced this way (0 to 1). */
export function readingConsistency(ds: Dataset, stats: Stats, gpcId: number, weight: Weight): number {
  const t = stats.byGrapheme.get(ds.gpcs[gpcId].grapheme);
  if (!t) return NaN;
  return weight === 'freq' ? share(stats.occFreq[gpcId], t.occFreq) : share(stats.occ[gpcId], t.occ);
}

/** Of all occurrences of this sound, the share spelled this way (0 to 1). */
export function spellingConsistency(ds: Dataset, stats: Stats, gpcId: number, weight: Weight): number {
  const t = stats.byPhoneme[ds.gpcs[gpcId].phoneme.index];
  return weight === 'freq' ? share(stats.occFreq[gpcId], t.occFreq) : share(stats.occ[gpcId], t.occ);
}

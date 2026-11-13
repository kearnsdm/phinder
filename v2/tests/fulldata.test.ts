// Checks against the real word data. Skipped when the data file is absent
// (it is not in the repository; run `npm run data` first).

import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import config from '../pack.config.json';
import { buildDataset, gpcsOf, unpack } from '../src/lib/dataset';
import { AFFIXES, Morph, alignLetters } from '../src/lib/morph';
import { emptyQuery } from '../src/lib/query';
import { search, sortResults } from '../src/lib/search';

const file = new URL(`../public/${config.file}`, import.meta.url);
const present = existsSync(file);
const ds = present ? buildDataset(unpack(new Uint8Array(readFileSync(file)))) : null!;
const verbose = !!process.env.PHINDER_VERBOSE;

describe.skipIf(!present)('full word data', () => {
  it('loads every word', () => {
    expect(ds.n).toBeGreaterThan(100000);
    expect(ds.gpcs.length).toBeGreaterThan(370);
  });

  it('holds no blocked word, and keeps ordinary words that look similar', () => {
    for (const w of ['ass', 'tit', 'tits', 'piss', 'pissed']) expect(ds.wordIndex.has(w)).toBe(false);
    for (const w of ['class', 'pass', 'title', 'heroines', 'snigger', 'analysis']) expect(ds.wordIndex.has(w)).toBe(true);
  });

  it('has a display for every phoneme that occurs', () => {
    const used = new Set<number>();
    for (const seq of ds.seq) for (const g of gpcsOf(ds, seq)) used.add(g.phoneme.index);
    const blank = [...used].map((i) => ds.phonemes[i]).filter((p) => !p.silent && (!p.sc || !p.ipa));
    expect(blank.map((p) => p.code)).toEqual([]);
  });

  it('finds the words the old search missed', () => {
    const q = { ...emptyQuery(), all: [{ type: 'unit' as const, gpcs: [ds.gpcByKey.get('e_E')!.id], position: 'any' as const }] };
    const found = new Set(search(ds, q).map((i) => ds.word[i]));
    expect(found.has('aesthetic')).toBe(true);
    const q2 = { ...emptyQuery(), all: [{ type: 'unit' as const, gpcs: [ds.gpcByKey.get('n_n')!.id], position: 'any' as const }] };
    expect(new Set(search(ds, q2).map((i) => ds.word[i])).has('foreknown')).toBe(true);
  });

  it('searches the whole list quickly', () => {
    const q = { ...emptyQuery(), all: [{ type: 'unit' as const, gpcs: [ds.gpcByKey.get('a_@')!.id], position: 'any' as const }] };
    const t = performance.now();
    const hits = sortResults(ds, search(ds, q), 'freq-desc');
    const ms = performance.now() - t;
    if (verbose) console.log(`a = schwa: ${hits.length} words in ${ms.toFixed(0)} ms`);
    expect(ms).toBeLessThan(1500);
  });

  it('lines up letters with sound spellings for nearly all words', () => {
    let ok = 0;
    const bad: string[] = [];
    for (let i = 0; i < ds.n; i++) {
      if (alignLetters(ds.word[i], gpcsOf(ds, ds.seq[i]))) ok++;
      else if (bad.length < 25) bad.push(ds.word[i]);
    }
    if (verbose) console.log(`aligned ${ok} of ${ds.n} (${((100 * ok) / ds.n).toFixed(2)}%)`, bad.join(', '));
    expect(ok / ds.n).toBeGreaterThan(0.97);
  });

  it('finds affixed words', () => {
    const morph = new Morph(ds);
    const t = performance.now();
    for (const def of AFFIXES) {
      const hits = [...morph.hitsByWord(def.id).values()];
      const keep = hits.filter((h) => h.keepsSound);
      if (verbose) {
        const top = sortResults(ds, keep.map((h) => h.word), 'freq-desc').slice(0, 14);
        console.log(`${def.label.padEnd(22)} ${String(keep.length).padStart(5)} keep sound, ${String(hits.length - keep.length).padStart(5)} change | ${top.map((i) => ds.word[i]).join(' ')}`);
      }
    }
    if (verbose) console.log(`all affixes: ${(performance.now() - t).toFixed(0)} ms`);
    const un = morph.hitsByWord('pre-un');
    const has = (w: string) => un.has(ds.wordIndex.get(w)!);
    expect(has('unhappy')).toBe(true);
    expect(has('under')).toBe(false);
    expect(has('uncle')).toBe(false);
    expect(has('unit')).toBe(false);
    expect(has('units')).toBe(false); // "its" is a word, but un- is not pronounced /yoon/
  });
});

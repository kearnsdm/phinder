// Word parts (prefixes and suffixes), found BY RULE.
//
// The word data has no morpheme coding, so this module estimates it:
//   1. The word starts (prefix) or ends (suffix) with the affix letters.
//   2. What is left is itself a word in the list, after undoing the usual
//      spelling changes (dropped e, doubled consonant, y changed to i).
//   3. The affix boundary falls between two sound spellings, never inside one
//      (so "read" is not re + ad, because "ea" is one grapheme).
// Each match also records whether the base word keeps its pronunciation
// inside the longer word ("keepsSound"): make -> making does; sign -> signal
// does not.
//
// Rules cannot see meaning. "corner" passes every test for corn + er. Treat
// the results as candidates, and replace this module with a morpheme database
// if one becomes available: the rest of the app only uses hitsByWord() and parse().

import { gpcsOf, type Dataset, type Gpc } from './dataset';

export interface AffixForm {
  text: string;
  /** Endings to try putting back on the stem, for example "act" + "t" for ac|tion. */
  restore?: string[];
  /** The last sound of the base may change (act -> action). */
  loose?: boolean;
  /** Prefix forms only: the base must start with one of these letters (im- before b, m, p). */
  before?: string;
}

export interface AffixDef {
  id: string;
  kind: 'prefix' | 'suffix';
  label: string;
  meaning: string;
  forms: AffixForm[];
}

const f = (text: string, extra: Partial<AffixForm> = {}): AffixForm => ({ text, ...extra });
const prefix = (id: string, meaning: string, forms: AffixForm[] = [f(id)]): AffixDef => ({
  id: `pre-${id}`,
  kind: 'prefix',
  label: forms.map((x) => `${x.text}-`).join(', '),
  meaning,
  forms,
});
const suffix = (id: string, meaning: string, forms: AffixForm[] = [f(id)]): AffixDef => ({
  id: `suf-${id}`,
  kind: 'suffix',
  label: forms.map((x) => `-${x.text}`).join(', '),
  meaning,
  forms,
});

export const AFFIXES: AffixDef[] = [
  prefix('un', 'not; reverse'),
  prefix('re', 'again; back'),
  prefix('in', 'not; in', [f('in'), f('im', { before: 'bmp' }), f('il', { before: 'l' }), f('ir', { before: 'r' })]),
  prefix('dis', 'not; apart'),
  prefix('mis', 'wrongly'),
  prefix('pre', 'before'),
  prefix('non', 'not'),
  prefix('over', 'too much; above'),
  prefix('under', 'too little; below'),
  prefix('sub', 'under'),
  prefix('inter', 'between'),
  prefix('fore', 'before; front'),
  prefix('de', 'down; remove'),
  prefix('trans', 'across'),
  prefix('super', 'above; beyond'),
  prefix('semi', 'half'),
  prefix('anti', 'against'),
  prefix('mid', 'middle'),
  prefix('en', 'cause to; put into', [f('en'), f('em', { before: 'bp' })]),
  prefix('ex', 'out; former'),
  prefix('co', 'together'),
  prefix('out', 'beyond; more than'),
  prefix('up', 'up'),
  prefix('bi', 'two'),
  prefix('tri', 'three'),
  prefix('multi', 'many'),
  prefix('auto', 'self'),
  prefix('tele', 'far'),
  prefix('post', 'after'),
  prefix('counter', 'against'),

  suffix('s', 'more than one; verb ending', [f('s'), f('es')]),
  suffix('ed', 'past'),
  suffix('ing', 'action; ongoing'),
  suffix('er', 'more; person who'),
  suffix('or', 'person who'),
  suffix('est', 'most'),
  suffix('ly', 'in this way'),
  suffix('y', 'having; like'),
  suffix('ful', 'full of'),
  suffix('less', 'without'),
  suffix('ness', 'state of being'),
  suffix('ment', 'act or result'),
  suffix('able', 'can be', [f('able'), f('ible')]),
  suffix('ion', 'act; state', [
    f('ation', { restore: ['e'] }),
    f('ition', { restore: ['e'] }),
    f('tion', { restore: ['t', 'te', 'e'], loose: true }),
    f('sion', { restore: ['d', 'de', 's', 'se', 't'], loose: true }),
    f('ion', { loose: true }),
  ]),
  suffix('al', 'related to', [f('al'), f('ial')]),
  suffix('ous', 'full of', [f('ous'), f('ious'), f('eous')]),
  suffix('ive', 'tending to', [f('ive'), f('ative'), f('itive')]),
  suffix('ic', 'related to'),
  suffix('ity', 'state of', [f('ity'), f('ty')]),
  suffix('en', 'made of; to make'),
  suffix('ish', 'somewhat; like'),
  suffix('ist', 'person who'),
  suffix('ize', 'to make', [f('ize'), f('ise')]),
  suffix('ship', 'state of; skill'),
  suffix('hood', 'state of'),
  suffix('ward', 'in the direction of', [f('ward'), f('wards')]),
  suffix('age', 'act; result'),
  suffix('ance', 'act; state', [f('ance'), f('ence')]),
];

export const affixById = new Map(AFFIXES.map((a) => [a.id, a]));

export interface AffixHit {
  word: number;
  base: number;
  /** The affix letters as they appear in this word. */
  form: string;
  keepsSound: boolean;
  /** Prefixes only: how the prefix letters are pronounced in this word. */
  affixSounds?: string;
}

/** Two-letter words that may serve as a base. Other bases need three letters or more. */
const SHORT_BASES = new Set(['do', 'go', 'be', 'ox', 'ax', 'up']);
const VOWEL_START = /^[aeiouy]/;
const isConsonant = (c: string) => /[bcdfghjklmnpqrstvwxz]/.test(c);

/**
 * Where each sound spelling starts in the written word. The data leaves out
 * hyphens, apostrophes, and the second letter of most doubled consonants, so
 * those are stepped over. Returns null when the spelling cannot be lined up.
 */
export function alignLetters(word: string, gpcs: Gpc[]): number[] | null {
  const starts: number[] = [];
  let pos = 0;
  let pendingE = false; // the "e" of a split digraph, written after the next grapheme
  for (const g of gpcs) {
    const letters = g.splitVowel ?? (g.grapheme === '#' ? '' : g.grapheme);
    if (letters === '') {
      starts.push(pos);
      continue;
    }
    while (!word.startsWith(letters, pos)) {
      const c = word[pos];
      if (c === undefined) return null;
      if (c === '-' || c === "'" || (pos > 0 && c === word[pos - 1])) pos++;
      else return null;
    }
    starts.push(pos);
    pos += letters.length;
    if (pendingE) {
      if (word[pos] === 'e') pos++;
      pendingE = false;
    }
    if (g.splitVowel !== null) pendingE = true;
  }
  if (pendingE && word[pos] === 'e') pos++;
  while (pos < word.length && (word[pos] === '-' || word[pos] === "'" || word[pos] === word[pos - 1])) pos++;
  if (pos !== word.length) return null;
  starts.push(word.length);
  return starts;
}

/**
 * The index of the sound spelling that starts at letter position `cut`, or -1.
 * `shared` is true when `cut` falls on the second letter of a doubled
 * consonant that the data codes once ("real|ly", "mis|spell"): the sound
 * spelling before the boundary then belongs to both parts.
 */
function boundaryAt(starts: number[], word: string, cut: number): { k: number; shared: boolean } {
  const k = starts.indexOf(cut);
  if (k >= 0) return { k, shared: false };
  if (cut > 0 && word[cut] === word[cut - 1]) {
    const k2 = starts.indexOf(cut + 1);
    if (k2 > 0) return { k: k2, shared: true };
  }
  return { k: -1, shared: false };
}

/** The sounds of a run of sound spellings as a comparable string (silent letters left out). */
function sounds(gpcs: Gpc[]): string {
  let s = '';
  for (const g of gpcs) if (!g.phoneme.silent) s += String.fromCharCode(33 + g.phoneme.index);
  return s;
}

export class Morph {
  private cache = new Map<string, Map<number, AffixHit>>();

  constructor(private ds: Dataset) {}

  /**
   * A base must be a word in the list. A base shorter than five letters must
   * also have a frequency value: the list holds short names and rare forms
   * ("der", "nat", "thi") that would turn "under", "nation" and "this" into
   * affixed words.
   */
  private baseIndex(candidate: string, word: string): number | undefined {
    if (candidate === word) return undefined;
    if (candidate.length < 3 && !SHORT_BASES.has(candidate)) return undefined;
    const base = this.ds.wordIndex.get(candidate);
    if (base === undefined) return undefined;
    return candidate.length >= 5 || !Number.isNaN(this.ds.freq[base]) ? base : undefined;
  }

  private analyzePrefix(i: number, def: AffixDef): AffixHit | null {
    const { ds } = this;
    const word = ds.word[i];
    for (const form of def.forms) {
      if (!word.startsWith(form.text) || word.length <= form.text.length) continue;
      let rest = word.slice(form.text.length);
      if (rest[0] === '-') rest = rest.slice(1);
      if (form.before && !form.before.includes(rest[0])) continue;
      const base = this.baseIndex(rest, word);
      if (base === undefined) continue;
      const gpcs = gpcsOf(ds, ds.seq[i]);
      const starts = alignLetters(word, gpcs);
      if (!starts) continue;
      const { k, shared } = boundaryAt(starts, word, word.length - rest.length);
      if (k <= 0 || k >= gpcs.length) continue;
      const keepsSound = sounds(gpcs.slice(shared ? k - 1 : k)) === sounds(gpcsOf(ds, ds.seq[base]));
      return { word: i, base, form: form.text, keepsSound, affixSounds: sounds(gpcs.slice(0, k)) };
    }
    return null;
  }

  private analyzeSuffix(i: number, def: AffixDef): AffixHit | null {
    const { ds } = this;
    const word = ds.word[i];
    let fallback: AffixHit | null = null;
    for (const form of def.forms) {
      const cut = word.length - form.text.length;
      if (cut < 2 || !word.endsWith(form.text)) continue;
      const stem = word.slice(0, cut);
      if (/[-']$/.test(stem)) continue;

      // Candidate base words, each with whether a y -> i change was undone.
      const candidates: [string, boolean][] = [[stem, false]];
      const vowelStart = VOWEL_START.test(form.text);
      if (vowelStart && !stem.endsWith('e')) candidates.push([stem + 'e', false]);
      if (vowelStart && stem.length >= 3 && stem[cut - 1] === stem[cut - 2] && isConsonant(stem[cut - 1])) {
        candidates.push([stem.slice(0, -1), false]);
      }
      if (stem.endsWith('i') && form.text[0] !== 'i' && form.text !== 's') {
        candidates.push([stem.slice(0, -1) + 'y', true]);
      }
      for (const r of form.restore ?? []) candidates.push([stem + r, false]);

      let gpcs: Gpc[] | null = null;
      let k = -1;
      for (const [candidate, yChanged] of candidates) {
        const base = this.baseIndex(candidate, word);
        if (base === undefined) continue;
        if (!gpcs) {
          gpcs = gpcsOf(ds, ds.seq[i]);
          const starts = alignLetters(word, gpcs);
          if (!starts) break;
          k = boundaryAt(starts, word, cut).k;
          // "baked" is coded b + a-e + k + d: the e of "-ed" belongs to the split digraph.
          if (k < 0 && form.text[0] === 'e') {
            const k2 = starts.indexOf(cut + 1);
            if (k2 >= 2 && gpcs[k2 - 2].splitVowel !== null) k = k2;
          }
          if (k <= 0 || k > gpcs.length) break;
        }
        const before = sounds(gpcs.slice(0, k));
        const baseSounds = sounds(gpcsOf(ds, ds.seq[base]));
        // "Loose" forms let the last sound of the base change or merge into the
        // suffix: act -> ac|tion, happy -> happi|ly.
        const allButLast = baseSounds.slice(0, -1);
        const keepsSound =
          before === baseSounds ||
          ((form.loose || yChanged) &&
            (before === allButLast || (before.length === baseSounds.length && before.slice(0, -1) === allButLast)));
        const hit: AffixHit = { word: i, base, form: form.text, keepsSound };
        if (keepsSound) return hit;
        fallback ??= hit;
      }
    }
    return fallback;
  }

  analyze(i: number, def: AffixDef): AffixHit | null {
    return def.kind === 'prefix' ? this.analyzePrefix(i, def) : this.analyzeSuffix(i, def);
  }

  /** Every word that has the affix, keyed by word index. Computed once per affix. */
  hitsByWord(affixId: string): Map<number, AffixHit> {
    let hits = this.cache.get(affixId);
    if (hits) return hits;
    hits = new Map();
    const def = affixById.get(affixId);
    if (def) {
      for (let i = 0; i < this.ds.n; i++) {
        const hit = this.analyze(i, def);
        if (hit) hits.set(i, hit);
      }
      if (def.kind === 'prefix') this.dropUnusualPronunciations(hits);
      // "really" is real + ly, not reall + y.
      if (affixId === 'suf-y') {
        const ly = this.hitsByWord('suf-ly');
        for (const i of [...hits.keys()]) if (ly.has(i)) hits.delete(i);
      }
    }
    this.cache.set(affixId, hits);
    return hits;
  }

  /**
   * A prefix has a few usual pronunciations (un- is /ŭn/). Words in which the
   * same letters sound different ("units", with /yoon/) are not that prefix.
   * The usual pronunciations are learned from the clearest cases: words whose
   * base has five or more letters and keeps its sound.
   */
  private dropUnusualPronunciations(hits: Map<number, AffixHit>): void {
    const counts = new Map<string, number>();
    let clear = 0;
    for (const hit of hits.values()) {
      if (!hit.keepsSound || this.ds.word[hit.base].length < 5) continue;
      clear++;
      counts.set(hit.affixSounds!, (counts.get(hit.affixSounds!) ?? 0) + 1);
    }
    if (clear < 20) return; // too few clear cases to judge
    for (const [i, hit] of hits) {
      if ((counts.get(hit.affixSounds!) ?? 0) / clear < 0.05) hits.delete(i);
    }
  }

  /** The affixes found on one word. */
  parse(i: number): { def: AffixDef; hit: AffixHit }[] {
    const out: { def: AffixDef; hit: AffixHit }[] = [];
    for (const def of AFFIXES) {
      const hit = this.hitsByWord(def.id).get(i);
      if (hit) out.push({ def, hit });
    }
    return out;
  }
}

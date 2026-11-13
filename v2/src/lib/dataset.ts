// Loads the packed word data and exposes it in a form the search can scan quickly.
//
// Each word's pronunciation is stored as a string in which every character
// stands for one sound spelling (for example "ea = /ē/"). Searching for a
// sound spelling, or a run of adjacent ones, is then a plain substring test,
// and a match can never start in the middle of a longer grapheme.

import { gunzipSync, strFromU8, strToU8 } from 'fflate';
import config from '../../pack.config.json';
import { metaFor, type Notation, type PhonemeGroup, type Structure } from './phonemeMeta';

export interface PackedData {
  v: number;
  phonemes: [code: string, soundCode: string, ipa: string][];
  gpcs: [grapheme: string, code: string][];
  listedCount: number;
  words: string;
}

export interface Phoneme {
  index: number;
  code: string;
  sc: string;
  ipa: string;
  struct: Structure;
  group: PhonemeGroup;
  schwa: boolean;
  silent: boolean;
}

/** A sound spelling: one grapheme with one phoneme. */
export interface Gpc {
  id: number;
  grapheme: string;
  /** Letters before the "-e" of a split digraph such as "a-e"; otherwise null. */
  splitVowel: string | null;
  phoneme: Phoneme;
  /** Stable name used in share links, for example "ea_i". */
  key: string;
  /** The character that stands for this sound spelling in Dataset.seq. */
  ch: string;
}

export interface Dataset {
  phonemes: Phoneme[];
  gpcs: Gpc[];
  gpcByKey: Map<string, Gpc>;
  /** Number of words. The arrays below all have this length and share indexes. */
  n: number;
  word: string[];
  /** Frequency; NaN when the word has no frequency value. */
  freq: Float64Array;
  syllables: Uint8Array;
  /** Count of letters a-z (hyphens and apostrophes are not letters). */
  letters: Uint8Array;
  seq: string[];
  wordIndex: Map<string, number>;
  charBase: number;
}

export function unpack(bytes: Uint8Array): PackedData {
  const key = strToU8(config.key);
  const plain = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) plain[i] = bytes[i] ^ key[i % key.length];
  return JSON.parse(strFromU8(gunzipSync(plain))) as PackedData;
}

export function buildDataset(packed: PackedData): Dataset {
  const charBase = config.gpcCharBase;

  const phonemes: Phoneme[] = packed.phonemes.map(([code, sc, ipa], index) => {
    const meta = metaFor(code);
    return {
      index,
      code,
      sc: (meta.sc ?? sc).trim(),
      ipa: (meta.ipa ?? ipa).trim(),
      struct: meta.struct,
      group: meta.group,
      schwa: !!meta.schwa,
      silent: meta.struct === 'S',
    };
  });
  const phonemeByCode = new Map(phonemes.map((p) => [p.code, p]));

  const gpcs: Gpc[] = packed.gpcs.map(([grapheme, code], id) => {
    const split = /^(.+)-e$/.exec(grapheme);
    return {
      id,
      grapheme,
      splitVowel: split ? split[1] : null,
      phoneme: phonemeByCode.get(code)!,
      key: `${grapheme}_${code}`,
      ch: String.fromCharCode(charBase + id),
    };
  });

  const lines = packed.words.length ? packed.words.split('\n') : [];
  const n = lines.length;
  const word = new Array<string>(n);
  const seq = new Array<string>(n);
  const freq = new Float64Array(n);
  const syllables = new Uint8Array(n);
  const letters = new Uint8Array(n);
  const wordIndex = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    const cells = lines[i].split('\t');
    word[i] = cells[0];
    freq[i] = cells[1] === '' ? NaN : Number(cells[1]);
    syllables[i] = Number(cells[2]);
    seq[i] = cells[3];
    let count = 0;
    for (let k = 0; k < cells[0].length; k++) {
      const c = cells[0].charCodeAt(k);
      if (c >= 97 && c <= 122) count++;
    }
    letters[i] = count;
    wordIndex.set(cells[0], i);
  }

  return {
    phonemes,
    gpcs,
    gpcByKey: new Map(gpcs.map((g) => [g.key, g])),
    n,
    word,
    freq,
    syllables,
    letters,
    seq,
    wordIndex,
    charBase,
  };
}

/**
 * The single-file version of the site (scripts/make-local.mjs) carries the
 * packed data and the logo inside the page, because a page opened from disk
 * is not allowed to fetch other files.
 */
export interface InlineAssets {
  /** The packed data file, base64-encoded. */
  data?: string;
  /** The logo as a data: address. */
  logo?: string;
}

export const inlineAssets = (): InlineAssets =>
  (globalThis as { __PHINDER_INLINE__?: InlineAssets }).__PHINDER_INLINE__ ?? {};

function fromBase64(text: string): Uint8Array {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function loadDataset(url: string): Promise<Dataset> {
  const embedded = inlineAssets().data;
  if (embedded) return buildDataset(unpack(fromBase64(embedded)));
  const response = await fetch(url);
  if (!response.ok) throw new Error(`The word data could not be loaded (${response.status}).`);
  return buildDataset(unpack(new Uint8Array(await response.arrayBuffer())));
}

/** The sound spellings of one word, in order. */
export function gpcsOf(ds: Dataset, seq: string): Gpc[] {
  const out: Gpc[] = new Array(seq.length);
  for (let k = 0; k < seq.length; k++) out[k] = ds.gpcs[seq.charCodeAt(k) - ds.charBase];
  return out;
}

export const seqOf = (ds: Dataset, ids: number[]): string => ids.map((id) => ds.gpcs[id].ch).join('');

// ---- display ---------------------------------------------------------------

export const phonemeText = (p: Phoneme, notation: Notation): string => (notation === 'ipa' ? p.ipa : p.sc) || p.code;

/** "/ā/". A silent letter is "/ /", as in the first version of Phinder. */
export const phonemeLabel = (p: Phoneme, notation: Notation): string =>
  p.silent ? '/ /' : `/${phonemeText(p, notation)}/`;

/** Grapheme "#" in the data marks a sound that has no letter of its own. */
export const graphemeLabel = (grapheme: string): string => (grapheme === '#' ? '(no letter)' : grapheme);

export const gpcLabel = (g: Gpc, notation: Notation): string =>
  `${graphemeLabel(g.grapheme)} = ${phonemeLabel(g.phoneme, notation)}`;

export function formatFrequency(f: number): string {
  if (Number.isNaN(f)) return '';
  if (f >= 100) return Math.round(f).toLocaleString('en-US');
  if (f >= 1) return f.toFixed(1);
  if (f >= 0.01) return f.toFixed(2);
  return '<0.01';
}

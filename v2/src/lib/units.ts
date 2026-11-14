// A "unit" is one sound spelling, or several that must sit next to each
// other in a word (for example the rime a-e + k, shown as "ake").

import { phonemeText, SILENT, type Gpc } from './dataset';
import type { Notation } from './phonemeMeta';

export type UnitShape = 'single' | 'rime' | 'body' | 'sequence';

/**
 * The letters of a unit as they appear in a word. A split digraph such as
 * "a-e" wraps around the next grapheme: a-e + k is written "ake".
 */
export function unitSpelling(gpcs: Gpc[]): string {
  let out = '';
  for (let i = 0; i < gpcs.length; i++) {
    const g = gpcs[i];
    if (g.grapheme === '#') continue; // a sound with no letter
    if (g.splitVowel !== null && i + 1 < gpcs.length) {
      const next = gpcs[i + 1];
      out += g.splitVowel + (next.grapheme === '#' ? '' : next.grapheme) + 'e';
      i++;
    } else {
      out += g.grapheme;
    }
  }
  return out || '(no letter)';
}

/** The sounds of a unit, for example "/āk/"; "/-/" when no part has a sound. */
export function unitSound(gpcs: Gpc[], notation: Notation): string {
  const sounded = gpcs.filter((g) => !g.phoneme.silent);
  if (sounded.length === 0) return SILENT;
  return `/${sounded.map((g) => phonemeText(g.phoneme, notation)).join('')}/`;
}

export const unitLabel = (gpcs: Gpc[], notation: Notation): string =>
  `${unitSpelling(gpcs)} = ${unitSound(gpcs, notation)}`;

/**
 * rime: a vowel followed by consonants (ake, ight).
 * body: consonants followed by a vowel (ca, stra).
 */
export function unitShape(gpcs: Gpc[]): UnitShape {
  if (gpcs.length < 2) return 'single';
  const s = gpcs.map((g) => g.phoneme.struct).filter((x) => x !== 'S');
  if (s.length < 2) return 'sequence';
  const consonant = (x: string) => x === 'C' || x === 'CC';
  if ((s[0] === 'V' || s[0] === 'VC') && s.slice(1).every(consonant)) return 'rime';
  const last = s[s.length - 1];
  if ((last === 'V' || last === 'CV') && s.slice(0, -1).every(consonant)) return 'body';
  return 'sequence';
}

export interface BodyRime {
  onset: Gpc[];
  nucleus: Gpc;
  coda: Gpc[];
  body: Gpc[];
  rime: Gpc[];
}

/** Splits a one-syllable word at its vowel. Returns null when no vowel sound is found. */
export function bodyRime(gpcs: Gpc[]): BodyRime | null {
  const k = gpcs.findIndex((g) => ['V', 'VC', 'CV'].includes(g.phoneme.struct));
  if (k < 0) return null;
  return {
    onset: gpcs.slice(0, k),
    nucleus: gpcs[k],
    coda: gpcs.slice(k + 1),
    body: gpcs.slice(0, k + 1),
    rime: gpcs.slice(k),
  };
}

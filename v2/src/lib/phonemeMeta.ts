// What the app knows about each phoneme code beyond the raw data files:
// its sound structure (used for body and rime units), the group it is shown
// under in the "sound to spelling" picker, and display corrections.
//
// DISPLAY CORRECTIONS. Each one replaces a display string in
// Sound_IPA_List.txt that looks like a typing error or a leftover machine
// code. Devin reviewed them with example words on November 13, 2026.
// Delete a line here to go back to the display in the data file.

export type Notation = 'sc' | 'ipa';

/** Sound structure: V vowel, C consonant, VC vowel+consonant, CV consonant+vowel, CC two consonants, S silent. */
export type Structure = 'V' | 'C' | 'CC' | 'VC' | 'CV' | 'S';

export type PhonemeGroup =
  | 'Short vowels'
  | 'Long vowels'
  | 'Other vowels'
  | 'Vowels with r'
  | 'Consonants'
  | 'Combined sounds'
  | 'Silent';

export const PHONEME_GROUPS: PhonemeGroup[] = [
  'Short vowels',
  'Long vowels',
  'Other vowels',
  'Vowels with r',
  'Consonants',
  'Combined sounds',
  'Silent',
];

interface Meta {
  struct: Structure;
  group: PhonemeGroup;
  /** Corrected Sound Code display. */
  sc?: string;
  /** Corrected IPA display. */
  ipa?: string;
  schwa?: boolean;
}

const m = (struct: Structure, group: PhonemeGroup, extra: Partial<Meta> = {}): Meta => ({ struct, group, ...extra });

export const PHONEME_META: Record<string, Meta> = {
  // Short vowels
  a: m('V', 'Short vowels'),
  E: m('V', 'Short vowels'),
  I: m('V', 'Short vowels'),
  A: m('V', 'Short vowels'),
  V: m('V', 'Short vowels'),
  // Long vowels
  e: m('V', 'Long vowels'),
  i: m('V', 'Long vowels'),
  aI: m('V', 'Long vowels'),
  ou: m('V', 'Long vowels'),
  u: m('V', 'Long vowels'),
  ju: m('CV', 'Long vowels'),
  // Other vowels
  U: m('V', 'Other vowels'),
  O: m('V', 'Other vowels'),
  aU: m('V', 'Other vowels'),
  OI: m('V', 'Other vowels'),
  '@': m('V', 'Other vowels', { schwa: true }),
  '3': m('V', 'Other vowels'),
  '{': m('V', 'Other vowels'),
  o: m('V', 'Other vowels'),
  // Vowels with r
  Ar: m('V', 'Vowels with r'),
  Er: m('V', 'Vowels with r'),
  '3r': m('V', 'Vowels with r'),
  Ir: m('V', 'Vowels with r'),
  Or: m('V', 'Vowels with r', { sc: 'or' }), // data file shows "o`"
  Ur: m('V', 'Vowels with r', { sc: 'o͝or' }), // data file shows "o]or"
  aIr: m('V', 'Vowels with r'),
  aIEr: m('V', 'Vowels with r', { sc: 'īər' }), // data file shows "ī@`"
  auEr: m('V', 'Vowels with r'),
  OIr: m('V', 'Vowels with r'),
  '@r': m('V', 'Vowels with r', { sc: 'ər', schwa: true }), // data file shows "@`"
  OXrr: m('V', 'Vowels with r', { sc: 'or', ipa: 'ɔɹ' }), // not in Sound_IPA_List.txt
  jUr: m('CV', 'Vowels with r'),
  jEr: m('CV', 'Vowels with r'),
  j3r: m('CV', 'Vowels with r'),
  wAr: m('CV', 'Vowels with r'),
  'waI@r': m('CV', 'Vowels with r', { sc: 'wīər', ipa: 'waɪɚ' }), // not in Sound_IPA_List.txt
  // Consonants
  b: m('C', 'Consonants'),
  d: m('C', 'Consonants'),
  f: m('C', 'Consonants'),
  g: m('C', 'Consonants'),
  h: m('C', 'Consonants'),
  j: m('C', 'Consonants'),
  k: m('C', 'Consonants'),
  l: m('C', 'Consonants'),
  m: m('C', 'Consonants'),
  n: m('C', 'Consonants'),
  p: m('C', 'Consonants'),
  r: m('C', 'Consonants'),
  s: m('C', 'Consonants'),
  t: m('C', 'Consonants'),
  v: m('C', 'Consonants'),
  w: m('C', 'Consonants'),
  z: m('C', 'Consonants'),
  S: m('C', 'Consonants'),
  Z: m('C', 'Consonants'),
  tS: m('C', 'Consonants', { ipa: 'ʧ' }), // data file shows "ʇ"; one character, like "ʤ" for the j sound
  dZ: m('C', 'Consonants'),
  T: m('C', 'Consonants', { ipa: 'θ' }), // data file shows "ɵ"
  D: m('C', 'Consonants'),
  N: m('C', 'Consonants'),
  W: m('C', 'Consonants'),
  '4': m('C', 'Consonants'),
  '5': m('C', 'Consonants'),
  // Combined sounds
  ks: m('CC', 'Combined sounds'),
  kw: m('CC', 'Combined sounds', { ipa: 'kw' }), // data file shows "kɑ"
  gz: m('CC', 'Combined sounds', { sc: 'gz' }), // data file shows "gzz"
  kS: m('CC', 'Combined sounds'),
  gZ: m('CC', 'Combined sounds'),
  ts: m('CC', 'Combined sounds'),
  '@l': m('VC', 'Combined sounds', { sc: 'əl', ipa: 'əl', schwa: true }), // data file shows "@l"
  '@m': m('VC', 'Combined sounds', { sc: 'əm', ipa: 'əm', schwa: true }), // data file shows "@m"
  '@n': m('VC', 'Combined sounds', { sc: 'ən', ipa: 'ən', schwa: true }), // data file shows "@n"
  'l=': m('VC', 'Combined sounds', { schwa: true }),
  'm=': m('VC', 'Combined sounds', { schwa: true }),
  'n=': m('VC', 'Combined sounds', { schwa: true }),
  'j@': m('CV', 'Combined sounds', { sc: 'y\u0259', schwa: true }), // data file shows "y@"
  jE: m('CV', 'Combined sounds'),
  jou: m('CV', 'Combined sounds', { sc: 'yō' }), // data file shows "yōoo"
  wV: m('CV', 'Combined sounds'),
  wA: m('CV', 'Combined sounds'),
  waI: m('CV', 'Combined sounds'),
  mA: m('CV', 'Combined sounds'),
  // Silent
  '#': m('S', 'Silent'),
  X: m('S', 'Silent'), // not in Sound_IPA_List.txt; marks the first letter of a doubled consonant
  '!': m('S', 'Silent'),
};

export const DEFAULT_META: Meta = { struct: 'C', group: 'Combined sounds' };

export const metaFor = (code: string): Meta => PHONEME_META[code] ?? DEFAULT_META;

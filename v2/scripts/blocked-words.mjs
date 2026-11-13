// Words that are left out of the packed data, so they never reach the site.
//
// BLOCKED_WORDS is the list from the first version of Phinder (js/createWordList.js,
// removed in commit 896c03b). Devin decided on November 13, 2026 to block these
// words entirely, with no switch to show them.
//
// Also blocked, because they are forms of the same words:
//   - plural, possessive and verb forms ("-s", "-es", "'s", "-ed", "-ing", "-ies")
//   - hyphenated words with a blocked word as one part ("pissed-off")
//   - any word that contains one of STRONG_STEMS ("shithead")
// NOT_BLOCKED lists ordinary words that those rules would catch by accident.

export const BLOCKED_WORDS = [
  "anal", "anus", "ass", "asshole", "assholes", "bastard", "bastards", "bitch",
  "bitches", "boner", "boners", "boob", "boobs", "breast", "breasts", "bullshit",
  "chink", "clitoris", "cocaine", "cock", "cocks", "cunt", "dick", "dicks",
  "dike", "dildo", "douche", "drunk", "drunks", "dyke", "erection", "erections",
  "fag", "faggot", "faggots", "fags", "fuck", "genitalia", "heroin", "jackass",
  "marijuana", "nigger", "penis", "piss", "pussy", "scrotum", "semen", "shit",
  "testicle", "testicles", "tit", "tits", "vagina", "whore",
];

/** Diminutive and compound forms of words on the list that the rules below do not reach. */
export const BLOCKED_FORMS = ['boobies', 'titties', 'tittie', 'titty', 'dickhead', 'dickheads', 'cocksucker', 'cocksuckers', 'smartass', 'dumbass', 'badass'];

export const STRONG_STEMS = ['fuck', 'shit', 'bitch', 'whore', 'cunt', 'asshole', 'piss', 'nigger', 'faggot'];

export const NOT_BLOCKED = [
  'heroines', // heroine + s, not heroin + es
  'matsushita', 'wakarimashita', 'mishit', // contain "shit" by accident
  'snigger', 'sniggered', 'sniggering', 'sniggeringly', 'sniggers', // contain "nigger" by accident
];

const VOWELS = 'aeiouy';

/** The inflected forms of one word: plural, possessive, past, -ing. */
function inflections(word) {
  const out = [`${word}s`, `${word}es`, `${word}'s`, `${word}s'`, `${word}ed`, `${word}ing`];
  const last = word[word.length - 1];
  if (last === 'e') out.push(`${word}d`, `${word.slice(0, -1)}ing`); // whore -> whored, whoring
  if (!VOWELS.includes(last)) out.push(`${word}${last}ed`, `${word}${last}ing`); // shit -> shitted, shitting
  if (last === 'y' && !VOWELS.includes(word[word.length - 2])) out.push(`${word.slice(0, -1)}ies`, `${word.slice(0, -1)}ied`);
  return out;
}

const exact = new Set([...BLOCKED_WORDS, ...BLOCKED_FORMS]);
for (const word of BLOCKED_WORDS) for (const form of inflections(word)) exact.add(form);
const allowed = new Set(NOT_BLOCKED);

/** true when the word must be left out of the packed data. */
export function isBlocked(word) {
  const w = word.toLowerCase();
  if (allowed.has(w)) return false;
  if (exact.has(w)) return true;
  if (STRONG_STEMS.some((stem) => w.includes(stem))) return true;
  return w.includes('-') && w.split('-').some((part) => exact.has(part) && !allowed.has(part));
}

// Turns the text of the three raw Phinder files into the object the app loads.
// Used by scripts/build-data.mjs and by the tests.

const TOKEN = /^([^_\s]*)_([^_\s]*)_+$/; // grapheme_phoneme_ (tolerates a doubled final underscore)

const hexChars = (cells) =>
  cells
    .map((c) => c.trim())
    .filter((c) => c !== '' && c !== '-')
    .map((c) => String.fromCharCode(parseInt(c, 16)))
    .join('');

/**
 * @param {{ words: string, soundList: string, ipaList: string, gpcCharBase: number }} raw
 * @returns {{ payload: object, report: { words: number, skipped: number, problems: Record<string, number> } }}
 */
export function packRaw({ words, soundList, ipaList, gpcCharBase }) {
  // ---- phonemes: code, Sound Code display, IPA display ----
  const phonemes = [];
  const phonemeIndex = new Map();
  for (const line of ipaList.replace(/^﻿/, '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cells = line.split('\t');
    const code = cells[0];
    if (phonemeIndex.has(code)) continue;
    phonemeIndex.set(code, phonemes.length);
    phonemes.push([code, hexChars(cells.slice(1, 6)), hexChars(cells.slice(6, 9))]);
  }

  // ---- sound spellings ----
  const gpcs = [];
  const gpcIndex = new Map();
  const gpcId = (grapheme, code) => {
    const key = `${grapheme}_${code}`;
    let id = gpcIndex.get(key);
    if (id === undefined) {
      id = gpcs.length;
      gpcIndex.set(key, id);
      gpcs.push([grapheme, code]);
      if (!phonemeIndex.has(code)) {
        // A code used in the word list but missing from Sound_IPA_List.txt.
        phonemeIndex.set(code, phonemes.length);
        phonemes.push([code, '', '']);
      }
    }
    return id;
  };

  // Register SoundList.txt first so ids stay stable when the word list changes.
  for (const line of soundList.replace(/^﻿/, '').split(/\r?\n/)) {
    const m = TOKEN.exec(line.trim());
    if (m) gpcId(m[1], m[2]);
  }
  const listedCount = gpcs.length;

  // ---- words ----
  const rows = [];
  const problems = {};
  let skipped = 0;
  for (const line of words.replace(/^﻿/, '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cells = line.split('\t');
    if (cells.length < 4 || cells[2].trim().length <= 1) {
      skipped++;
      continue;
    }
    const word = cells[0].trim();
    const freq = cells[1].trim() === '' ? '' : String(Number(cells[1]));
    const syllables = parseInt(cells[3], 10) || 0;
    let seq = '';
    for (const token of cells[2].trim().split(/\s+/)) {
      if (token === "'" || token === '') continue; // a bare apostrophe is punctuation, not a sound spelling
      const m = TOKEN.exec(token);
      if (!m) {
        problems[token] = (problems[token] || 0) + 1;
        continue;
      }
      seq += String.fromCharCode(gpcCharBase + gpcId(m[1], m[2]));
    }
    if (!seq) {
      skipped++;
      continue;
    }
    rows.push(`${word}\t${freq}\t${syllables}\t${seq}`);
  }

  return {
    payload: { v: 1, phonemes, gpcs, listedCount, words: rows.join('\n') },
    report: { words: rows.length, skipped, problems },
  };
}

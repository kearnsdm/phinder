// Turns a word list into text for copying or downloading.

import { formatFrequency, gpcLabel, gpcsOf, type Dataset } from './dataset';
import type { Notation } from './phonemeMeta';

/** "c = /k/  a = /ă/  t = /t/" */
export const breakdown = (ds: Dataset, i: number, notation: Notation): string =>
  gpcsOf(ds, ds.seq[i])
    .map((g) => gpcLabel(g, notation))
    .join('  ');

const csvCell = (value: string | number): string => {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** A spreadsheet file. It starts with a byte-order mark so Excel reads the sound symbols correctly. */
export function resultsToCsv(ds: Dataset, indexes: number[], notation: Notation): string {
  const rows = [['word', 'sound spellings', 'syllables', 'letters', 'frequency']];
  for (const i of indexes) {
    rows.push([
      ds.word[i],
      breakdown(ds, i, notation),
      String(ds.syllables[i]),
      String(ds.letters[i]),
      Number.isNaN(ds.freq[i]) ? '' : String(ds.freq[i]),
    ]);
  }
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** One word per line. */
export const resultsToText = (ds: Dataset, indexes: number[]): string => indexes.map((i) => ds.word[i]).join('\n');

export { formatFrequency };

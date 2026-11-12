// Cleans the three raw Phinder text files and packs them into the one file
// the app loads (public/data/phinder.dat).
//
// The raw files are NOT in the repository. Put them in v2/data/raw/ (or set
// PHINDER_RAW_DIR) before running `npm run data`:
//   AmericanWordDataList.txt   word <tab> frequency <tab> sound spellings <tab> syllables
//   SoundList.txt              one sound spelling per line, for example "ea_i_"
//   Sound_IPA_List.txt         phoneme code <tab> 5 Sound Code hex chars <tab> 3 IPA hex chars
//
// The packed file is gzip-compressed and scrambled with a fixed key. A person
// cannot open it as plain text, but this is not real protection: the app
// itself must be able to read the file, so a programmer could too.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, strToU8 } from 'fflate';
import { packRaw } from './pack-lib.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(root, 'pack.config.json'), 'utf8'));
const rawDir = process.env.PHINDER_RAW_DIR || join(root, 'data', 'raw');
const outFile = join(root, 'public', config.file);

function readRaw(name) {
  const path = join(rawDir, name);
  if (!existsSync(path)) {
    console.error(`\nMissing data file: ${path}`);
    console.error('The word data is not stored in the repository. Copy the three raw');
    console.error('text files into v2/data/raw/ and run `npm run data` again.\n');
    process.exit(1);
  }
  return readFileSync(path, 'utf8');
}

const { payload, report } = packRaw({
  words: readRaw('AmericanWordDataList.txt'),
  soundList: readRaw('SoundList.txt'),
  ipaList: readRaw('Sound_IPA_List.txt'),
  gpcCharBase: config.gpcCharBase,
});

const zipped = gzipSync(strToU8(JSON.stringify(payload)), { level: 9 });
const key = strToU8(config.key);
for (let i = 0; i < zipped.length; i++) zipped[i] ^= key[i % key.length];

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, zipped);

console.log(`Packed ${report.words.toLocaleString()} words, ${payload.gpcs.length} sound spellings`);
console.log(`(${payload.listedCount} from SoundList.txt, ${payload.gpcs.length - payload.listedCount} found only in the word list),`);
console.log(`${payload.phonemes.length} phoneme codes -> ${outFile} (${(zipped.length / 1024).toFixed(0)} KB)`);
if (report.skipped) console.log(`Skipped ${report.skipped} rows without sound spellings.`);
if (Object.keys(report.problems).length) console.log('Unreadable tokens ignored:', report.problems);

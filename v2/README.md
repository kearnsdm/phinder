# Phinder 2 (beta)

The new version of Phinder. It keeps the look and the four steps of the first
version (in the repository root) and adds new ways to search.

## What is new

| Area | Change |
| --- | --- |
| Search | Matching is exact on whole sound spellings. The first version missed words when the same letters first appeared inside a longer grapheme (for example `e = /ĕ/` in "aesthetic"). |
| Grids | Every grapheme and every phoneme can be reached. The grids scroll when there are more than fit. |
| Start with a sound | "Start with: Sound" picks a phoneme first, then one of its spellings. |
| Word parts | "Start with: Word part" searches for prefixes and suffixes. They are found by rule (see `src/lib/morph.ts`), so results need checking. |
| Join (+) | Joined sound spellings form one unit. A split digraph is written around the next grapheme (`a-e` + `k` = `ake`). Units are labelled "rime" or "body" when they have that shape. |
| Position | Click a selected sound spelling to require it at the start, in the middle, or at the end of the word. |
| Advanced | One OR row (at least one of these) and one NOT row (none of these). |
| Decodable words only | A KNOWN row holds the sound spellings students know. The list shows only words made entirely from them. |
| Options | Limits apply at once. The limits in force are shown above the list. A word-set switch keeps only words that have a frequency value. |
| Word list | The count follows "Filter Words". Small frequencies are shown (0.31, not blank). The sort choice is kept. |
| Export | Copy the words, download a spreadsheet file (CSV), print a list, print word cards. |
| Share | "Copy link" copies an address that reopens the same search. |
| Explore a Word | One word, taken apart: a tile per sound spelling with its consistency, body and rime for one-syllable words, and word parts. |

## Data

The word data is **not in this repository** and must not be committed.
`.gitignore` excludes `data/raw/` and `public/data/`.

To build the site you need the three source files in `v2/data/raw/`:

| File | Contents |
| --- | --- |
| `AmericanWordDataList.txt` | word, frequency, sound spellings, syllables (tab-separated) |
| `SoundList.txt` | one sound spelling per line, for example `ea_i_` |
| `Sound_IPA_List.txt` | phoneme code, five Sound Code characters, three IPA characters (hex) |

`npm run data` cleans them and writes one packed file, `public/data/phinder.dat`
(about 1 MB). The app loads only that file. The packed file is compressed and
scrambled with a fixed key, so a person cannot open it as text. This is not
real protection: the app must be able to read the file, so a programmer could
too. Keeping the data fully private would need the search to run on a server.

`npm run data` also leaves out the words in `scripts/blocked-words.mjs`
(words unsuitable for children, from the first version's list, plus their
plural, possessive and verb forms). Those words never reach the site.

Display corrections for phonemes (for example `/@l/` shown as `/əl/`) are in
`src/lib/phonemeMeta.ts`, one line each, so they are easy to review or remove.

## Commands

```bash
npm install
```

```bash
npm run data
```

```bash
npm run dev
```

```bash
npm test
```

```bash
npm run build
```

`npm run build` writes the finished site to `dist/`. Upload the contents of
`dist/` to any folder on a web host (for example
`devinkearns.com/phinder-is-phabulous/`). The site uses relative addresses, so
it works at any path. There is no server code.

To test on a computer without a web server, run:

```bash
npm run build:local
```

This writes `phinder2-test.html`, one file with the script, styles, fonts,
logo and packed data inside it. Double-click it to open the site. Opening
`dist/index.html` from disk does not work: browsers do not let a page opened
from disk load its script and data files. `phinder2-test.html` contains the
word data and is git-ignored.

`npm test` runs the unit tests on a small hand-written word list
(`tests/fixture.ts`). When `public/data/phinder.dat` is present, it also runs
checks against the full data (`tests/fulldata.test.ts`).

## Where things are

| Path | Purpose |
| --- | --- |
| `scripts/pack-lib.mjs`, `scripts/build-data.mjs` | Clean and pack the raw data |
| `scripts/blocked-words.mjs` | Words left out of the packed data |
| `scripts/make-local.mjs` | Make the single-file test version |
| `src/lib/dataset.ts` | Load the packed data |
| `src/lib/search.ts` | The search engine |
| `src/lib/query.ts`, `src/lib/edit.ts` | The shape of a search and the changes a user can make to it |
| `src/lib/units.ts` | Joined units, split digraphs, body and rime |
| `src/lib/stats.ts` | Counts and consistency |
| `src/lib/morph.ts` | Prefixes and suffixes by rule |
| `src/lib/urlState.ts` | Share links |
| `src/lib/export.ts` | Copy and spreadsheet export |
| `src/components/` | The screens |
| `src/styles.css` | The look (colors and sizes from the first version) |

To add a new kind of search criterion: add a type to `Criterion` in
`src/lib/query.ts`, a matcher in `compileCriterion` in `src/lib/search.ts`, a
label in `src/lib/edit.ts`, and an encoding in `src/lib/urlState.ts`.

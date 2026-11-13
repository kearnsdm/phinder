import { describe, expect, it } from 'vitest';
import { strToU8, gzipSync } from 'fflate';
import config from '../pack.config.json';
import { formatFrequency, gpcsOf, gpcLabel, unpack } from '../src/lib/dataset';
import { resultsToCsv, resultsToText } from '../src/lib/export';
import { Morph, affixById, alignLetters } from '../src/lib/morph';
import { emptyQuery, type Criterion, type Query } from '../src/lib/query';
import { allowedGpcs, matchedPositions, search, sortResults } from '../src/lib/search';
import { computeStats, readingConsistency, spellingConsistency } from '../src/lib/stats';
import { bodyRime, unitLabel, unitShape, unitSpelling } from '../src/lib/units';
import { decodeState, defaultState, encodeState } from '../src/lib/urlState';
import { isBlocked } from '../scripts/blocked-words.mjs';
import { packRaw } from '../scripts/pack-lib.mjs';
import { fixtureDataset, fixturePacked, ids, IPA_LIST, SOUND_LIST, WORD_LIST } from './fixture';

const ds = fixtureDataset();
const morph = new Morph(ds);
const unit = (keys: string[], position: 'any' | 'start' | 'middle' | 'end' = 'any'): Criterion => ({
  type: 'unit',
  gpcs: ids(ds, ...keys),
  position,
});
const words = (q: Partial<Query>) =>
  search(ds, { ...emptyQuery(), ...q }, morph)
    .map((i) => ds.word[i])
    .sort();

describe('data loading', () => {
  it('reads words, frequencies, syllables and letter counts', () => {
    const i = ds.wordIndex.get('a-bomb')!;
    expect(ds.letters[i]).toBe(5); // the hyphen is not a letter
    expect(Number.isNaN(ds.freq[i])).toBe(true);
    expect(ds.syllables[i]).toBe(2);
    expect(ds.freq[ds.wordIndex.get('cat')!]).toBe(95.5);
  });

  it('repairs untidy tokens: bare apostrophes, double spaces, doubled underscore', () => {
    const i = ds.wordIndex.get('zzz-odd')!;
    expect(gpcsOf(ds, ds.seq[i]).map((g) => g.key)).toEqual(['z_z', 'z_z', 'y_i']);
  });

  it('survives the pack and unpack round trip', () => {
    const packed = fixturePacked();
    const bytes = gzipSync(strToU8(JSON.stringify(packed)));
    const key = strToU8(config.key);
    for (let k = 0; k < bytes.length; k++) bytes[k] ^= key[k % key.length];
    expect(unpack(bytes)).toEqual(packed);
  });

  it('applies the display corrections and labels silent letters', () => {
    expect(gpcLabel(ds.gpcByKey.get('or_Or')!, 'sc')).toBe('or = /or/');
    expect(gpcLabel(ds.gpcByKey.get("n'_@n")!, 'sc')).toBe("n' = /ən/");
    expect(gpcLabel(ds.gpcByKey.get('g_#')!, 'sc')).toBe('g = / /');
    expect(gpcLabel(ds.gpcByKey.get('th_T')!, 'ipa')).toBe('th = /θ/');
  });

  it('formats frequencies without losing small values', () => {
    expect(formatFrequency(74997.8)).toBe('74,998');
    expect(formatFrequency(95.5)).toBe('95.5');
    expect(formatFrequency(0.31)).toBe('0.31');
    expect(formatFrequency(NaN)).toBe('');
  });
});

describe('blocked words', () => {
  it('leaves blocked words out of the packed data', () => {
    const raw = { words: WORD_LIST, soundList: SOUND_LIST, ipaList: IPA_LIST, gpcCharBase: 256 };
    const blockCat = (w: string) => w === 'cat' || w === 'cats';
    const { payload, report } = packRaw({ ...raw, isBlocked: blockCat });
    const kept = payload.words.split('\n').map((l) => l.split('\t')[0]);
    expect(report.blocked).toBe(2);
    expect(kept).not.toContain('cat');
    expect(kept).not.toContain('cats');
    expect(kept).toContain('cake');
  });

  it('blocks forms of a listed word but not ordinary words that look similar', () => {
    for (const w of ['shit', 'shits', 'shitting', 'shithead', 'pissed-off', 'whoring', 'pussies']) expect(isBlocked(w)).toBe(true);
    for (const w of ['class', 'pass', 'title', 'heroines', 'anti-heroines', 'snigger', 'mishit', 'cocker', 'analysis', 'abreast']) {
      expect(isBlocked(w)).toBe(false);
    }
  });
});

describe('search', () => {
  it('finds a sound spelling that first appears inside a longer grapheme (old bug)', () => {
    expect(words({ all: [unit(['e_E'])] })).toEqual(['aesthetic']);
    expect(words({ all: [unit(['n_n'])] })).toContain('known');
  });

  it('never matches part of a longer grapheme', () => {
    // "a_e" (a = /ā/) must not match the split digraph "a-e_e".
    expect(words({ all: [unit(['a_e'])] })).toEqual(['a-bomb', 'making']);
  });

  it('requires every sound spelling in the "all" group', () => {
    expect(words({ all: [unit(['a_a']), unit(['p_p'])] })).toEqual(['happiness', 'happy', 'map', 'nap', 'tap', 'unhappy']);
  });

  it('matches joined units only when the parts are adjacent and in order', () => {
    expect(words({ all: [unit(['a-e_e', 'k_k'])] })).toEqual(['bake', 'baked', 'cake', 'lake', 'make']);
    expect(words({ all: [unit(['k_k', 'a-e_e'])] })).toEqual([]);
  });

  it('limits a unit to the start or end of the word', () => {
    expect(words({ all: [unit(['a-e_e', 'k_k'], 'end')] })).toEqual(['bake', 'cake', 'lake', 'make']);
    expect(words({ all: [unit(['c_k', 'a_a'], 'start')] })).toEqual(['cat', 'cats']);
    expect(words({ all: [unit(['t_t'], 'start')] })).toEqual(['tap', 'tin']);
    // Middle: not the first and not the last sound spelling.
    expect(words({ all: [unit(['t_t'], 'middle')] })).toEqual(['aesthetic', 'cats']);
    expect(words({ all: [unit(['a-e_e', 'k_k'], 'middle')] })).toEqual(['baked']);
    expect(words({ all: [unit(['n_n'], 'middle')] })).toEqual(['corner', 'happiness', 'running', 'signal', 'under', 'unhappy', 'unit']);
  });

  it('supports "at least one of" and "none of"', () => {
    expect(words({ any: [unit(['sh_S']), unit(['kn_n'])] })).toEqual(['known', 'ship']);
    expect(words({ all: [unit(['a_a'])], none: [unit(['t_t']), unit(['p_p'])] })).toEqual(['action', 'man']);
    expect(words({ all: [unit(['i_I'])], any: [unit(['p_p']), unit(['s_s'])] })).toEqual([
      'aesthetic', 'pin', 'ship', 'signal', 'sit', 'spit',
    ]);
  });

  it('returns only decodable words when asked', () => {
    const taught = ids(ds, 'm_m', 'a_a', 'p_p', 'i_I', 'n_n', 's_s', 't_t');
    expect(words({ decodable: true, taught })).toEqual(['man', 'map', 'mat', 'nap', 'pin', 'sat', 'sit', 'spit', 'tap', 'tin']);
    // A target sound spelling in the search is allowed automatically.
    const q = { ...emptyQuery(), decodable: true, taught, all: [unit(['sh_S'])] };
    expect(words(q)).toEqual(['ship']);
    expect(allowedGpcs(q).has(ids(ds, 'sh_S')[0])).toBe(true);
  });

  it('returns nothing until there is something to look for', () => {
    expect(words({})).toEqual([]);
    expect(words({ none: [unit(['a_a'])] })).toEqual([]);
    expect(words({ decodable: true })).toEqual([]);
  });

  it('applies syllable, letter and frequency limits', () => {
    const all = [unit(['a_a'])];
    const f = emptyQuery().filters;
    expect(words({ all, filters: { ...f, syllablesMin: 2 } })).toEqual(['action', 'happiness', 'happy', 'unhappy']);
    expect(words({ all, filters: { ...f, syllablesMax: 1, lettersMax: 3 } })).toEqual(['act', 'cat', 'man', 'map', 'mat', 'nap', 'sat', 'tap']);
    expect(words({ all, filters: { ...f, frequencyMin: 100 } })).toEqual(['action', 'happy', 'man', 'sat']);
    expect(words({ all, filters: { ...f, frequencyMax: 10 } })).toEqual(['mat', 'nap']);
  });

  it('can limit the word set to words that have a frequency value', () => {
    expect(words({ all: [unit(['e_E'])], wordSet: 'freq' })).toEqual([]);
    expect(words({ all: [unit(['m_m'])] })).toContain('a-bomb');
    expect(words({ all: [unit(['m_m'])], wordSet: 'freq' })).not.toContain('a-bomb');
  });

  it('sorts, keeping words without a frequency last', () => {
    const idx = search(ds, { ...emptyQuery(), all: [unit(['m_m'])] });
    const names = (sort: Parameters<typeof sortResults>[2]) => sortResults(ds, [...idx], sort).map((i) => ds.word[i]);
    expect(names('freq-desc')).toEqual(['make', 'man', 'making', 'map', 'mat', 'a-bomb']);
    expect(names('freq-asc')).toEqual(['mat', 'map', 'making', 'man', 'make', 'a-bomb']);
    expect(names('alpha-desc')[0]).toBe('mat');
    expect(names('length-asc').slice(0, 3)).toEqual(['man', 'map', 'mat']);
  });

  it('reports which sound spellings matched, for highlighting', () => {
    const seq = ds.seq[ds.wordIndex.get('baked')!];
    expect([...matchedPositions(ds, seq, [unit(['a-e_e', 'k_k'])])]).toEqual([1, 2]);
    expect([...matchedPositions(ds, seq, [unit(['a-e_e', 'k_k'], 'end')])]).toEqual([]);
    expect([...matchedPositions(ds, seq, [unit(['k_k'], 'middle')])]).toEqual([2]);
    expect([...matchedPositions(ds, seq, [unit(['b_b'], 'middle')])]).toEqual([]);
  });
});

describe('units', () => {
  const g = (...keys: string[]) => keys.map((k) => ds.gpcByKey.get(k)!);

  it('writes a split digraph around the next grapheme (a-e + k = ake)', () => {
    expect(unitSpelling(g('a-e_e', 'k_k'))).toBe('ake');
    expect(unitLabel(g('a-e_e', 'k_k'), 'sc')).toBe('ake = /āk/');
    expect(unitSpelling(g('a-e_e'))).toBe('a-e');
    expect(unitSpelling(g('b_b', 'a-e_e', 'k_k', 'd_t'))).toBe('baked');
  });

  it('names rime and body units', () => {
    expect(unitShape(g('a-e_e', 'k_k'))).toBe('rime');
    expect(unitShape(g('c_k', 'a_a'))).toBe('body');
    expect(unitShape(g('c_k', 'u-e_ju'))).toBe('body');
    expect(unitShape(g('a_a'))).toBe('single');
    expect(unitShape(g('s_s', 'p_p'))).toBe('sequence');
  });

  it('splits a one-syllable word into body and rime', () => {
    const br = bodyRime(g('s_s', 'p_p', 'i_I', 't_t'))!;
    expect(unitSpelling(br.body)).toBe('spi');
    expect(unitSpelling(br.rime)).toBe('it');
    expect(unitSpelling(bodyRime(g('m_m', 'a-e_e', 'k_k'))!.rime)).toBe('ake');
  });
});

describe('consistency', () => {
  const stats = computeStats(ds, 'all');
  const [eaLong, eaSchwa] = ids(ds, 'ea_i', 'ea_@');

  it('computes reading consistency by word count and by frequency', () => {
    expect(readingConsistency(ds, stats, eaLong, 'words')).toBeCloseTo(0.5);
    expect(readingConsistency(ds, stats, eaLong, 'freq')).toBeCloseTo(500 / 683);
    expect(readingConsistency(ds, stats, eaSchwa, 'freq')).toBeCloseTo(183 / 683);
  });

  it('computes spelling consistency', () => {
    const [knN] = ids(ds, 'kn_n');
    const nTotal = stats.byPhoneme[ds.gpcs[knN].phoneme.index].occ;
    expect(spellingConsistency(ds, stats, knN, 'words')).toBeCloseTo(1 / nTotal);
  });

  it('lists the sounds of a grapheme, most common first, and counts words', () => {
    const a = stats.byGrapheme.get('a')!;
    expect(ds.gpcs[a.gpcs[0]].key).toBe('a_a');
    expect(stats.words[ids(ds, 'p_p')[0]]).toBe(9); // counted once per word
    expect(computeStats(ds, 'freq').nWords).toBe(ds.n - 3);
  });
});

describe('word parts', () => {
  const parse = (word: string, affix: string) => {
    const hit = morph.analyze(ds.wordIndex.get(word)!, affixById.get(affix)!);
    return hit ? `${ds.word[hit.base]}${hit.keepsSound ? '' : ' (sound changes)'}` : null;
  };

  it('lines letters up with sound spellings despite doubled letters and split digraphs', () => {
    const at = (w: string) => alignLetters(w, gpcsOf(ds, ds.seq[ds.wordIndex.get(w)!]));
    expect(at('running')).toEqual([0, 1, 2, 4, 5, 7]);
    expect(at('baked')).toEqual([0, 1, 2, 4, 5]);
    expect(at("didn't")).toEqual([0, 1, 2, 3, 5, 6]);
  });

  it('finds prefixes only on real base words', () => {
    expect(parse('unhappy', 'pre-un')).toBe('happy');
    expect(parse('under', 'pre-un')).toBeNull(); // "der" is not a word
    expect(parse('unit', 'pre-un')).toBeNull(); // "it" is too short to be a base
    expect(parse('read', 'pre-re')).toBeNull(); // "ea" is one grapheme
  });

  it('undoes spelling changes for suffixes', () => {
    expect(parse('making', 'suf-ing')).toBe('make'); // dropped e
    expect(parse('running', 'suf-ing')).toBe('run'); // doubled consonant
    expect(parse('happiness', 'suf-ness')).toBe('happy'); // y changed to i
    expect(parse('baked', 'suf-ed')).toBe('bake'); // e shared with the split digraph
    expect(parse('cats', 'suf-s')).toBe('cat');
  });

  it('marks words whose base changes its sound', () => {
    expect(parse('signal', 'suf-al')).toBe('sign (sound changes)');
    expect(parse('action', 'suf-ion')).toBe('act'); // the final t may change before -ion
  });

  it('works as a search criterion', () => {
    expect(words({ all: [{ type: 'affix', affix: 'suf-ing', keepsSound: true }] })).toEqual(['making', 'running']);
    expect(words({ all: [{ type: 'affix', affix: 'suf-al', keepsSound: true }] })).toEqual([]);
    expect(words({ all: [{ type: 'affix', affix: 'suf-al', keepsSound: false }] })).toEqual(['signal']);
  });
});

describe('share links', () => {
  it('round-trips a full search', () => {
    const state = defaultState();
    state.query = {
      all: [unit(['a-e_e', 'k_k'], 'end'), { type: 'affix', affix: 'suf-ed', keepsSound: false }],
      any: [unit(["n'_@n"], 'middle'), unit(['g_#'], 'start')],
      none: [unit(['sh_S'])],
      decodable: true,
      taught: ids(ds, 'm_m', 'a_a'),
      wordSet: 'freq',
      filters: { syllablesMin: 1, syllablesMax: 2, lettersMin: null, lettersMax: 5, frequencyMin: 10, frequencyMax: null },
    };
    state.sort = 'alpha-asc';
    state.notation = 'ipa';
    state.view = 'explore';
    state.exploreWord = "didn't";
    const hash = encodeState(ds, state);
    expect(decodeState(ds, '#' + hash)).toEqual(state);

    // Turning every limit off is different from the default limits.
    const open = defaultState();
    open.query.filters = emptyQuery().filters;
    expect(encodeState(ds, open)).toBe('syl=-&let=-');
    expect(decodeState(ds, '#syl=-&let=-')).toEqual(open);
  });

  it('gives defaults for an empty or damaged link', () => {
    expect(decodeState(ds, '')).toEqual(defaultState());
    expect(decodeState(ds, '#all=nope_x,%E0%A4%A&sort=sideways&syl=abc')).toEqual(defaultState());
    expect(encodeState(ds, defaultState())).toBe('');
  });
});

describe('export', () => {
  it('writes a CSV file and a plain list', () => {
    const idx = [ds.wordIndex.get('cat')!, ds.wordIndex.get('a-bomb')!];
    const csv = resultsToCsv(ds, idx, 'sc');
    expect(csv.split('\r\n')[0]).toBe('﻿word,sound spellings,syllables,letters,frequency');
    expect(csv.split('\r\n')[1]).toBe('cat,c = /k/  a = /ă/  t = /t/,1,3,95.5');
    expect(csv.split('\r\n')[2]).toBe('a-bomb,a = /ā/  b = /b/  o = /ŏ/  m = /m/  b = / /,2,5,');
    // The file ends with a blank row and the credit line.
    expect(csv.split('\r\n').slice(3)).toEqual(['', '"Made with Phinder, devinkearns.com"', '']);
    expect(resultsToText(ds, idx)).toBe('cat\na-bomb');
  });
});

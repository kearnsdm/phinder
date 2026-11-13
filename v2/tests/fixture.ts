// A small hand-written word list in the same format as the real data files,
// so the tests run without the real data (which is not in the repository).

import { packRaw } from '../scripts/pack-lib.mjs';
import { buildDataset, type Dataset, type PackedData } from '../src/lib/dataset';

const hex = (s: string) =>
  [...s].map((c) => c.charCodeAt(0).toString(16).padStart(4, '0')).concat(Array(5).fill('-'));

// code, Sound Code display, IPA display
const PHONEMES: [string, string, string][] = [
  ['a', 'ă', 'æ'], ['e', 'ā', 'e'], ['i', 'ē', 'i'], ['I', 'ĭ', 'ɪ'], ['E', 'ĕ', 'ɛ'], ['A', 'ŏ', 'ɑ'],
  ['V', 'ŭ', 'ʌ'], ['@', 'ə', 'ə'], ['ou', 'ō', 'o'], ['aI', 'ī', 'aɪ'], ['ju', 'yoo', 'ju'],
  ['Er', 'er', 'ɚ'], ['Or', 'o`', 'ɔɹ'], ['@n', '@n', '@n'], ['#', ' ', ' '],
  ['k', 'k', 'k'], ['t', 't', 't'], ['s', 's', 's'], ['z', 'z', 'z'], ['m', 'm', 'm'], ['p', 'p', 'p'],
  ['n', 'n', 'n'], ['S', 'sh', 'ʃ'], ['T', 'th', 'ɵ'], ['D', 'th', 'ð'], ['l', 'l', 'l'], ['r', 'r', 'r'],
  ['d', 'd', 'd'], ['h', 'h', 'h'], ['b', 'b', 'b'], ['g', 'g', 'g'], ['N', 'ng', 'ŋ'], ['dZ', 'j', 'ʤ'],
];

export const IPA_LIST = PHONEMES.map(([code, sc, ipa]) =>
  [code, ...hex(sc).slice(0, 5), ...hex(ipa).slice(0, 3)].join('\t'),
).join('\n');

// word, frequency ('' = none), sound spellings, syllables
const WORDS: [string, string, string, number][] = [
  ["a-bomb", '', 'a_e_ b_b_ o_A_ m_m_ b_#_', 2],
  ['ache', '6.3', 'a_e_ ch_k_ e_#_', 1],
  ['act', '80', 'a_a_ c_k_ t_t_', 1],
  ['action', '120', 'a_a_ c_k_ ti_S_ o_@_ n_n_', 2],
  ['aesthetic', '', 'ae_E_ s_s_ th_T_ e_E_ t_t_ i_I_ c_k_', 3],
  ['bake', '12', 'b_b_ a-e_e_ k_k_', 1],
  ['baked', '9', 'b_b_ a-e_e_ k_k_ d_t_', 1],
  ['cake', '40', 'c_k_ a-e_e_ k_k_', 1],
  ['cat', '95.5', 'c_k_ a_a_ t_t_', 1],
  ['cats', '30', 'c_k_ a_a_ t_t_ s_s_', 1],
  ['corn', '25', 'c_k_ or_Or_ n_n_', 1],
  ['corner', '60', 'c_k_ or_Or_ n_n_ er_Er_', 2],
  ['cube', '3', 'c_k_ u-e_ju_ b_b_', 1],
  ["didn't", '962.4', "d_d_ i_I_ d_d_ n'_@n_ t_t_", 2],
  ['happiness', '20', 'h_h_ a_a_ p_p_ i_i_ n_n_ e_@_ s_s_', 3],
  ['happy', '200', 'h_h_ a_a_ p_p_ y_i_', 2],
  ['known', '150', 'kn_n_ ow_ou_ n_n_', 1],
  ['lake', '55', 'l_l_ a-e_e_ k_k_', 1],
  ['make', '1644.2', 'm_m_ a-e_e_ k_k_', 1],
  ['making', '300', 'm_m_ a_e_ k_k_ i_I_ ng_N_', 2],
  ['man', '900', 'm_m_ a_a_ n_n_', 1],
  ['map', '45', 'm_m_ a_a_ p_p_', 1],
  ['mat', '8', 'm_m_ a_a_ t_t_', 1],
  ['nap', '6', 'n_n_ a_a_ p_p_', 1],
  ['ocean', '183', 'o_ou_ c_S_ ea_@_ n_n_', 2],
  ['pin', '14', 'p_p_ i_I_ n_n_', 1],
  ['read', '500', 'r_r_ ea_i_ d_d_', 1],
  ['running', '70', 'r_r_ u_V_ n_n_ i_I_ ng_N_', 2],
  ['run', '400', 'r_r_ u_V_ n_n_', 1],
  ['sat', '110', 's_s_ a_a_ t_t_', 1],
  ['ship', '90', 'sh_S_ i_I_ p_p_', 1],
  ['sign', '50', 's_s_ i_aI_ g_#_ n_n_', 1],
  ['signal', '35', 's_s_ i_I_ g_g_ n_n_ a_@_ l_l_', 2],
  ['sit', '130', 's_s_ i_I_ t_t_', 1],
  ['spit', '0.31', 's_s_ p_p_ i_I_ t_t_', 1],
  ['tap', '11', 't_t_ a_a_ p_p_', 1],
  ['the', '74997.8', 'th_D_ e_@_', 1],
  ['tin', '7', 't_t_ i_I_ n_n_', 1],
  ['under', '700', 'u_V_ n_n_ d_d_ er_Er_', 2],
  ['unhappy', '15', 'u_V_ n_n_ h_h_ a_a_ p_p_ y_i_', 3],
  ['unit', '44', 'u_ju_ n_n_ i_I_ t_t_', 2],
  ['zzz-odd', '', "' z_z_  z_z_ y_i__", 1],
];

export const WORD_LIST = WORDS.map(([w, f, s, n]) => [w, f, s, n].join('\t')).join('\n');

export const SOUND_LIST = ['a_a_', 'a_e_', 'a-e_e_', 'ea_i_', 'ea_@_', 'e_E_', 'ae_E_', 'n_n_', 'kn_n_', 'y_i__'].join('\n');

export function fixturePacked(): PackedData {
  return packRaw({ words: WORD_LIST, soundList: SOUND_LIST, ipaList: IPA_LIST, gpcCharBase: 256 }).payload as PackedData;
}

export const fixtureDataset = (): Dataset => buildDataset(fixturePacked());

/** Looks up sound-spelling ids by name, for example ids(ds, 'a-e_e', 'k_k'). */
export const ids = (ds: Dataset, ...keys: string[]): number[] =>
  keys.map((k) => {
    const g = ds.gpcByKey.get(k);
    if (!g) throw new Error(`No sound spelling ${k} in the fixture`);
    return g.id;
  });

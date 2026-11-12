// Steps 1 and 2: the two grids on the left.
//   Spelling mode:  1 Graphemes -> 2 Phonemes   (as in the first Phinder)
//   Sound mode:     1 Phonemes  -> 2 Graphemes
//   Word-part mode: 1 Prefixes,    2 Suffixes

import { useMemo, useState } from 'react';
import { graphemeLabel, phonemeLabel, type Dataset, type Gpc } from '../lib/dataset';
import { AFFIXES } from '../lib/morph';
import { PHONEME_GROUPS, type Notation } from '../lib/phonemeMeta';
import type { Stats } from '../lib/stats';

export type PickerMode = 'spelling' | 'sound' | 'part';

const DEFAULT_PATTERNS = ['a', 'ar', 'ck', 'e', 'ea', 'ee', 'igh', 'i-e', 'k', 'm', 'oa', 'ow', 'qu', 'x', 'y'];
const MIN_CELLS = 12; // the phoneme grid always shows at least 3 rows of 4, as before

interface Props {
  ds: Dataset;
  stats: Stats;
  notation: Notation;
  mode: PickerMode;
  onMode: (m: PickerMode) => void;
  onNotation: (n: Notation) => void;
  onPickGpc: (id: number) => void;
  onPickAffix: (id: string) => void;
  onHelp: () => void;
}

const percent = (part: number, whole: number) => (whole > 0 ? `${Math.round((100 * part) / whole)}%` : '');

export function Picker({ ds, stats, notation, mode, onMode, onNotation, onPickGpc, onPickAffix, onHelp }: Props) {
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [grapheme, setGrapheme] = useState<string | null>(null);
  const [phoneme, setPhoneme] = useState<number | null>(null);

  const allGraphemes = useMemo(() => [...stats.byGrapheme.keys()].sort(), [stats]);

  const graphemeCells = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (text) {
      const hits = allGraphemes.filter((g) => g.includes(text));
      return [...hits.filter((g) => g.startsWith(text)), ...hits.filter((g) => !g.startsWith(text))];
    }
    return showAll ? allGraphemes : DEFAULT_PATTERNS.filter((g) => stats.byGrapheme.has(g));
  }, [search, showAll, allGraphemes, stats]);

  const phonemeGroups = useMemo(() => {
    const text = search.trim().toLowerCase();
    return PHONEME_GROUPS.map((group) => ({
      group,
      items: ds.phonemes.filter(
        (p) =>
          p.group === group &&
          stats.byPhoneme[p.index].occ > 0 &&
          (!text || phonemeLabel(p, notation).toLowerCase().includes(text)),
      ),
    })).filter((g) => g.items.length > 0);
  }, [ds, stats, search, notation]);

  // Step 2 cells: the sound spellings for the grapheme or phoneme chosen in step 1.
  const step2: Gpc[] =
    mode === 'spelling'
      ? grapheme
        ? (stats.byGrapheme.get(grapheme)?.gpcs ?? []).map((id) => ds.gpcs[id])
        : []
      : mode === 'sound' && phoneme !== null
        ? stats.byPhoneme[phoneme].gpcs.map((id) => ds.gpcs[id])
        : [];
  const step2Total =
    mode === 'spelling'
      ? grapheme
        ? (stats.byGrapheme.get(grapheme)?.occ ?? 0)
        : 0
      : phoneme !== null
        ? stats.byPhoneme[phoneme].occ
        : 0;

  const changeMode = (m: PickerMode) => {
    setSearch('');
    onMode(m);
  };

  const cellTitle = (g: Gpc) =>
    mode === 'spelling'
      ? `${graphemeLabel(g.grapheme)} is ${phonemeLabel(g.phoneme, notation)} in ${percent(stats.occ[g.id], step2Total)} of its uses (${stats.words[g.id].toLocaleString()} words)`
      : `${phonemeLabel(g.phoneme, notation)} is spelled ${graphemeLabel(g.grapheme)} in ${percent(stats.occ[g.id], step2Total)} of its uses (${stats.words[g.id].toLocaleString()} words)`;

  /** Empty cells that complete the last row of 4 and fill the grid up to `min` cells. */
  const blanks = (used: number, min = 0) =>
    Array.from({ length: Math.max(min - used, (4 - (used % 4)) % 4) }, (_, k) => (
      <div key={`blank${k}`} className="cell blank" aria-hidden />
    ));

  return (
    <div className="picker">
      <div className="mode-switch" role="group" aria-label="Start with">
        <span className="mode-label">Start with</span>
        {(
          [
            ['spelling', 'Spelling'],
            ['sound', 'Sound'],
            ['part', 'Word part'],
          ] as [PickerMode, string][]
        ).map(([m, label]) => (
          <button key={m} type="button" className={mode === m ? 'toggle on' : 'toggle'} aria-pressed={mode === m} onClick={() => changeMode(m)}>
            {label}
          </button>
        ))}
      </div>

      <div className="picker-grids">
        {/* ---------------- step 1 ---------------- */}
        <div className="picker-col">
          <h2 className="heading">
            <span className="num">1</span>
            {mode === 'spelling' ? 'Graphemes' : mode === 'sound' ? 'Phonemes' : 'Prefixes'}
            <button type="button" className="help-icon" title="Help" aria-label="Help" onClick={onHelp}>
              ?
            </button>
          </h2>

          {mode === 'spelling' && (
            <div className="grid scroll" role="listbox" aria-label="Graphemes">
              {graphemeCells.map((g) => (
                <button
                  key={g}
                  type="button"
                  role="option"
                  aria-selected={grapheme === g}
                  className={grapheme === g ? 'cell picked' : 'cell'}
                  onClick={() => setGrapheme(g)}
                >
                  {graphemeLabel(g) === g ? g : '#'}
                </button>
              ))}
              {!search.trim() && (
                <button
                  type="button"
                  className="cell"
                  title={showAll ? 'Show the short list' : `Show all ${allGraphemes.length} graphemes`}
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? '‹' : '…'}
                </button>
              )}
              {search.trim() && graphemeCells.length === 0 && <div className="grid-note">No grapheme has those letters.</div>}
              {blanks(graphemeCells.length + (search.trim() ? 0 : 1), 16)}
            </div>
          )}

          {mode === 'sound' && (
            <div className="grid scroll" role="listbox" aria-label="Phonemes">
              {phonemeGroups.map(({ group, items }) => (
                <div key={group} className="grid-group">
                  <div className="grid-group-label">{group}</div>
                  {items.map((p) => (
                    <button
                      key={p.code}
                      type="button"
                      role="option"
                      aria-selected={phoneme === p.index}
                      className={`${phoneme === p.index ? 'cell picked' : 'cell'} sound${phonemeLabel(p, notation).length > 5 ? ' long' : ''}`}
                      title={`${stats.byPhoneme[p.index].gpcs.length} spellings`}
                      onClick={() => setPhoneme(p.index)}
                    >
                      {phonemeLabel(p, notation)}
                    </button>
                  ))}
                  {blanks(items.length)}
                </div>
              ))}
              {phonemeGroups.length === 0 && <div className="grid-note">No sound matches.</div>}
            </div>
          )}

          {mode === 'part' && (
            <div className="grid scroll wide">
              {AFFIXES.filter((a) => a.kind === 'prefix').map((a) => (
                <button key={a.id} type="button" className="cell part" title={`${a.label}: ${a.meaning}`} onClick={() => onPickAffix(a.id)}>
                  {a.forms[0].text}-
                </button>
              ))}
            </div>
          )}

          {mode !== 'part' ? (
            <div className="search-box">
              <input
                type="text"
                className="inputform"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={mode === 'spelling' ? 'Search Letter Pattern' : 'Search Sound'}
                aria-label={mode === 'spelling' ? 'Search letter pattern' : 'Search sound'}
              />
              <span className="search-icon" aria-hidden>
                &#9906;
              </span>
            </div>
          ) : (
            <p className="picker-note">Word parts are found by rule. Check the list before you use it.</p>
          )}
        </div>

        {/* ---------------- step 2 ---------------- */}
        <div className="picker-col">
          <h2 className="heading">
            <span className="num">2</span>
            {mode === 'spelling' ? 'Phonemes' : mode === 'sound' ? 'Graphemes' : 'Suffixes'}
          </h2>

          {mode !== 'part' ? (
            <div className="grid scroll" aria-label={mode === 'spelling' ? 'Phonemes' : 'Graphemes'}>
              {step2.map((g) => {
                const label = mode === 'spelling' ? phonemeLabel(g.phoneme, notation) : graphemeLabel(g.grapheme) === g.grapheme ? g.grapheme : '#';
                return (
                  <button
                    key={g.id}
                    type="button"
                    className={`cell${mode === 'spelling' ? ' sound' : ''}${label.length > 5 ? ' long' : ''}`}
                    title={cellTitle(g)}
                    onClick={() => onPickGpc(g.id)}
                  >
                    {label}
                  </button>
                );
              })}
              {blanks(step2.length, MIN_CELLS)}
            </div>
          ) : (
            <div className="grid scroll wide">
              {AFFIXES.filter((a) => a.kind === 'suffix').map((a) => (
                <button key={a.id} type="button" className="cell part" title={`${a.label}: ${a.meaning}`} onClick={() => onPickAffix(a.id)}>
                  -{a.forms[0].text}
                </button>
              ))}
            </div>
          )}

          <div className="notation" role="group" aria-label="Sound notation">
            <button type="button" className={notation === 'sc' ? 'toggle on' : 'toggle'} aria-pressed={notation === 'sc'} onClick={() => onNotation('sc')}>
              Sound Code
            </button>
            <button type="button" className={notation === 'ipa' ? 'toggle on' : 'toggle'} aria-pressed={notation === 'ipa'} onClick={() => onNotation('ipa')}>
              IPA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

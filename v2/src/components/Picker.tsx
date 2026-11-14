// Steps 1 and 2: the two grids on the left.
//   Spelling mode:  1 Graphemes -> 2 Phonemes   (as in the first Phinder)
//   Sound mode:     1 Phonemes  -> 2 Graphemes
// Pages that offer both modes get a round swap button between the two
// headings. Pages that offer word parts get "Prefix" and "Suffix" menus
// under the grids.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { graphemeLabel, phonemeLabel, type Dataset, type Gpc } from '../lib/dataset';
import { AFFIXES } from '../lib/morph';
import { PHONEME_GROUPS, type Notation } from '../lib/phonemeMeta';
import type { Stats } from '../lib/stats';

export type PickerMode = 'spelling' | 'sound';

/** The first grid of the first Phinder. */
export const DEFAULT_PATTERNS = ['a', 'ar', 'ck', 'e', 'ea', 'ee', 'igh', 'i-e', 'k', 'm', 'oa', 'ow', 'qu', 'x', 'y'];
const MIN_CELLS = 12; // the second grid always shows at least 3 rows of 4, as before

interface Props {
  ds: Dataset;
  stats: Stats;
  notation: Notation;
  mode: PickerMode;
  /** The ways into step 1 that this page offers. With two, a swap button switches between them. */
  modes: PickerMode[];
  onMode: (m: PickerMode) => void;
  onNotation: (n: Notation) => void;
  onPickGpc: (id: number) => void;
  /** When given, "Prefix" and "Suffix" menus appear under the grids. */
  onPickAffix?: (id: string) => void;
  onHelp: () => void;
  /** Graphemes shown in grid 1 before "…" is clicked. Default: the first Phinder's grid. */
  shortList?: string[];
  /**
   * Sound spellings the grids leave out: the very rare ones, and those with
   * no word within the limits and word shape now set.
   */
  hidden: (gpcId: number) => boolean;
}

/** Long labels get smaller type so that they stay inside the cell: "/yoo/" is "mid", "(no letter)" is "long". */
const fit = (label: string) => (label.length > 5 ? ' long' : label.length === 5 ? ' mid' : '');

const percent = (part: number, whole: number) => (whole > 0 ? `${Math.round((100 * part) / whole)}%` : '');

export function Picker(props: Props) {
  const { ds, stats, notation, mode, modes, onMode, onNotation, onPickGpc, onPickAffix, onHelp, hidden } = props;
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [grapheme, setGrapheme] = useState<string | null>(null);
  const [phoneme, setPhoneme] = useState<number | null>(null);

  const shortList = props.shortList ?? DEFAULT_PATTERNS;
  const allGraphemes = useMemo(
    () =>
      [...stats.byGrapheme.entries()]
        .filter(([, total]) => total.gpcs.some((id) => !hidden(id)))
        .map(([grapheme]) => grapheme)
        .sort(),
    [stats, hidden],
  );

  const graphemeCells = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (text) {
      const hits = allGraphemes.filter((g) => g.includes(text));
      return [...hits.filter((g) => g.startsWith(text)), ...hits.filter((g) => !g.startsWith(text))];
    }
    return showAll ? allGraphemes : shortList.filter((g) => allGraphemes.includes(g));
  }, [search, showAll, allGraphemes, shortList]);

  // The data has more than one code for a letter with no sound. The phoneme
  // grid shows one "/-/" cell for all of them.
  const silent = useMemo(() => {
    const codes = ds.phonemes.filter((p) => p.silent && stats.byPhoneme[p.index].gpcs.length > 0);
    return {
      cell: codes.length ? codes[0].index : -1,
      gpcs: codes.flatMap((p) => stats.byPhoneme[p.index].gpcs).sort((a, b) => stats.occ[b] - stats.occ[a]),
      occ: codes.reduce((sum, p) => sum + stats.byPhoneme[p.index].occ, 0),
    };
  }, [ds, stats]);
  /** The sound spellings of one cell of the phoneme grid. */
  const spellingsOf = useCallback((index: number) => (index === silent.cell ? silent.gpcs : stats.byPhoneme[index].gpcs), [silent, stats]);

  const phonemeGroups = useMemo(() => {
    const text = search.trim().toLowerCase();
    return PHONEME_GROUPS.map((group) => ({
      group,
      items: ds.phonemes.filter(
        (p) =>
          p.group === group &&
          (!p.silent || p.index === silent.cell) &&
          spellingsOf(p.index).some((id) => !hidden(id)) &&
          (!text || phonemeLabel(p, notation).toLowerCase().includes(text) || (p.silent && 'silent'.includes(text))),
      ),
    })).filter((g) => g.items.length > 0);
  }, [ds, silent, spellingsOf, search, notation, hidden]);

  // Step 2 cells: the sound spellings for the grapheme or phoneme chosen in step 1.
  const step2: Gpc[] = (
    mode === 'spelling' ? (grapheme ? (stats.byGrapheme.get(grapheme)?.gpcs ?? []) : []) : phoneme !== null ? spellingsOf(phoneme) : []
  )
    .filter((id) => !hidden(id))
    .map((id) => ds.gpcs[id]);
  const step2Total =
    mode === 'spelling'
      ? grapheme
        ? (stats.byGrapheme.get(grapheme)?.occ ?? 0)
        : 0
      : phoneme === null
        ? 0
        : phoneme === silent.cell
          ? silent.occ
          : stats.byPhoneme[phoneme].occ;

  /** The mode the swap button switches to; undefined when this page has one mode. */
  const otherMode = modes.length > 1 ? modes.find((m) => m !== mode) : undefined;
  const changeMode = (m: PickerMode) => {
    setSearch('');
    onMode(m);
  };

  // Swapping steps 1 and 2: the two grids slide toward each other and fade
  // ("out"), the mode changes, and the new grids arrive from the far side ("in").
  const [swap, setSwap] = useState<'idle' | 'out' | 'in'>('idle');
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const swapSteps = () => {
    if (!otherMode || swap !== 'idle') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      changeMode(otherMode);
      return;
    }
    setSwap('out');
    timers.current.push(
      window.setTimeout(() => {
        changeMode(otherMode);
        setSwap('in');
        timers.current.push(window.setTimeout(() => setSwap('idle'), 280));
      }, 200),
    );
  };

  /** In a tooltip, "/-/" is spelled out. */
  const soundName = (g: Gpc) => (g.phoneme.silent ? 'silent' : phonemeLabel(g.phoneme, notation));
  const cellTitle = (g: Gpc) =>
    mode === 'spelling'
      ? `${graphemeLabel(g.grapheme)} is ${soundName(g)} in ${percent(stats.occ[g.id], step2Total)} of its uses (${stats.words[g.id].toLocaleString()} words)`
      : `${g.phoneme.silent ? 'A silent letter' : phonemeLabel(g.phoneme, notation)} is spelled ${graphemeLabel(g.grapheme)} in ${percent(stats.occ[g.id], step2Total)} of its uses (${stats.words[g.id].toLocaleString()} words)`;

  /** Empty cells that complete the last row of 4 and fill the grid up to `min` cells. */
  const blanks = (used: number, min = 0) =>
    Array.from({ length: Math.max(min - used, (4 - (used % 4)) % 4) }, (_, k) => (
      <div key={`blank${k}`} className="cell blank" aria-hidden />
    ));

  const heading1 = mode === 'spelling' ? 'Graphemes' : 'Phonemes';
  const heading2 = mode === 'spelling' ? 'Phonemes' : 'Graphemes';
  const showMore = !search.trim() && allGraphemes.length > shortList.filter((g) => allGraphemes.includes(g)).length;

  const affixMenu = (kind: 'prefix' | 'suffix') => (
    <select
      className="affix-menu"
      aria-label={kind === 'prefix' ? 'Add a prefix' : 'Add a suffix'}
      value=""
      onChange={(e) => {
        if (e.target.value) onPickAffix?.(e.target.value);
      }}
    >
      <option value="">{kind === 'prefix' ? 'Prefix' : 'Suffix'}</option>
      {AFFIXES.filter((a) => a.kind === kind).map((a) => (
        <option key={a.id} value={a.id}>
          {a.label} ({a.meaning})
        </option>
      ))}
    </select>
  );

  return (
    <div className="picker">
      <div className={swap === 'idle' ? 'picker-grids' : `picker-grids swap-${swap}`}>
        {/* ---------------- step 1 ---------------- */}
        <div className="picker-col">
          <h2 className="heading">
            <span className="num">1</span>
            <span className="swap-part">{heading1}</span>
            <button type="button" className="help-icon" title="Help" aria-label="Help" onClick={onHelp}>
              ?
            </button>
          </h2>

          {mode === 'spelling' ? (
            <div className="grid scroll swap-part" role="listbox" aria-label="Graphemes">
              {graphemeCells.map((g) => (
                <button key={g} type="button" role="option" aria-selected={grapheme === g} className={grapheme === g ? 'cell picked' : 'cell'} onClick={() => setGrapheme(g)}>
                  {graphemeLabel(g) === g ? g : '#'}
                </button>
              ))}
              {showMore && (
                <button type="button" className="cell" title={showAll ? 'Show the short list' : `Show all ${allGraphemes.length}`} onClick={() => setShowAll(!showAll)}>
                  {showAll ? '‹' : '…'}
                </button>
              )}
              {search.trim() && graphemeCells.length === 0 && <div className="grid-note">Nothing here has those letters.</div>}
              {blanks(graphemeCells.length + (showMore ? 1 : 0), 16)}
            </div>
          ) : (
            <div className="grid scroll swap-part" role="listbox" aria-label="Phonemes">
              {phonemeGroups.map(({ group, items }) => (
                <div key={group} className="grid-group">
                  <div className="grid-group-label">{group}</div>
                  {items.map((p) => (
                    <button
                      key={p.code}
                      type="button"
                      role="option"
                      aria-selected={phoneme === p.index}
                      className={`${phoneme === p.index ? 'cell picked' : 'cell'} sound${fit(phonemeLabel(p, notation))}`}
                      title={`${p.silent ? 'Silent letters: ' : ''}${spellingsOf(p.index).filter((id) => !hidden(id)).length} spellings`}
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
        </div>

        {/* ---------------- step 2 ---------------- */}
        <div className="picker-col">
          <h2 className="heading">
            <span className="num">2</span>
            <span className="swap-part">{heading2}</span>
          </h2>

          <div className="grid scroll swap-part" aria-label={heading2}>
            {step2.map((g) => {
              const label = mode === 'spelling' ? phonemeLabel(g.phoneme, notation) : graphemeLabel(g.grapheme) === g.grapheme ? g.grapheme : '#';
              return (
                <button
                  key={g.id}
                  type="button"
                  className={`cell${mode === 'spelling' ? ' sound' : ''}${fit(label)}`}
                  title={cellTitle(g)}
                  onClick={() => onPickGpc(g.id)}
                >
                  {label}
                </button>
              );
            })}
            {blanks(step2.length, MIN_CELLS)}
          </div>

          <div className="notation" role="group" aria-label="Sound notation">
            <button type="button" className={notation === 'sc' ? 'toggle on' : 'toggle'} aria-pressed={notation === 'sc'} onClick={() => onNotation('sc')}>
              Sound Code
            </button>
            <button type="button" className={notation === 'ipa' ? 'toggle on' : 'toggle'} aria-pressed={notation === 'ipa'} onClick={() => onNotation('ipa')}>
              IPA
            </button>
          </div>
        </div>

        {/* Swaps steps 1 and 2: start with spellings, or start with sounds. */}
        {otherMode && (
          <button
            type="button"
            className={mode === 'sound' ? 'swap flipped' : 'swap'}
            title={`Swap steps 1 and 2: start with a ${otherMode}`}
            aria-label={`Swap steps 1 and 2: start with a ${otherMode}`}
            onClick={swapSteps}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M1 5h11M9 2l3 3-3 3M15 11H4M7 8l-3 3 3 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Word parts: a prefix or a suffix joins the sound spellings in step 3. */}
      {onPickAffix && (
        <div className="affix-row">
          <span className="affix-label">Word part</span>
          {affixMenu('prefix')}
          {affixMenu('suffix')}
        </div>
      )}
    </div>
  );
}

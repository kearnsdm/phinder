// Steps 1 and 2: the two grids on the left.
//   Spelling mode:  1 Graphemes -> 2 Phonemes   (as in the first Phinder)
//   Sound mode:     1 Phonemes  -> 2 Graphemes
//   Word-part mode: 1 Prefixes,    2 Suffixes
// The tabs of the word-list screen reuse this component and narrow it with
// the optional props (which graphemes to offer, which sounds, the headings).

import { useEffect, useMemo, useRef, useState } from 'react';
import { graphemeLabel, phonemeLabel, type Dataset, type Gpc } from '../lib/dataset';
import { AFFIXES } from '../lib/morph';
import { PHONEME_GROUPS, type Notation } from '../lib/phonemeMeta';
import type { Stats } from '../lib/stats';

export type PickerMode = 'spelling' | 'sound' | 'part';

/** The first grid of the first Phinder. */
export const DEFAULT_PATTERNS = ['a', 'ar', 'ck', 'e', 'ea', 'ee', 'igh', 'i-e', 'k', 'm', 'oa', 'ow', 'qu', 'x', 'y'];
const MIN_CELLS = 12; // the second grid always shows at least 3 rows of 4, as before

const MODE_LABEL: Record<PickerMode, string> = { spelling: 'spelling', sound: 'sound', part: 'word part' };

interface Props {
  ds: Dataset;
  stats: Stats;
  notation: Notation;
  mode: PickerMode;
  /** The ways into step 1 that this tab offers. With two, a link under the first grid switches between them. */
  modes: PickerMode[];
  onMode: (m: PickerMode) => void;
  onNotation: (n: Notation) => void;
  onPickGpc: (id: number) => void;
  onPickAffix: (id: string) => void;
  onHelp: () => void;
  /** Graphemes shown in grid 1 before "…" is clicked. Default: the first Phinder's grid. */
  shortList?: string[];
  /** Limits the graphemes offered. */
  graphemeFilter?: (grapheme: string) => boolean;
  /** Limits the sound spellings offered in grid 2. */
  gpcFilter?: (g: Gpc) => boolean;
  heading1?: string;
  heading2?: string;
  searchPlaceholder?: string;
  /** When set, the grids are replaced by this note. */
  closedNote?: string;
}

const percent = (part: number, whole: number) => (whole > 0 ? `${Math.round((100 * part) / whole)}%` : '');

export function Picker(props: Props) {
  const { ds, stats, notation, mode, modes, onMode, onNotation, onPickGpc, onPickAffix, onHelp } = props;
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [grapheme, setGrapheme] = useState<string | null>(null);
  const [phoneme, setPhoneme] = useState<number | null>(null);

  const { graphemeFilter, gpcFilter } = props;
  const shortList = props.shortList ?? DEFAULT_PATTERNS;

  const allGraphemes = useMemo(
    () => [...stats.byGrapheme.keys()].filter((g) => !graphemeFilter || graphemeFilter(g)).sort(),
    [stats, graphemeFilter],
  );

  const graphemeCells = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (text) {
      const hits = allGraphemes.filter((g) => g.includes(text));
      return [...hits.filter((g) => g.startsWith(text)), ...hits.filter((g) => !g.startsWith(text))];
    }
    return showAll ? allGraphemes : shortList.filter((g) => allGraphemes.includes(g));
  }, [search, showAll, allGraphemes, shortList]);

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
  const step2All: Gpc[] =
    mode === 'spelling'
      ? grapheme
        ? (stats.byGrapheme.get(grapheme)?.gpcs ?? []).map((id) => ds.gpcs[id])
        : []
      : mode === 'sound' && phoneme !== null
        ? stats.byPhoneme[phoneme].gpcs.map((id) => ds.gpcs[id])
        : [];
  const step2 = gpcFilter ? step2All.filter(gpcFilter) : step2All;
  const step2Total =
    mode === 'spelling'
      ? grapheme
        ? (stats.byGrapheme.get(grapheme)?.occ ?? 0)
        : 0
      : phoneme !== null
        ? stats.byPhoneme[phoneme].occ
        : 0;

  /** The mode the swap control switches to; undefined when this kind of list has one mode. */
  const otherMode = modes.length > 1 ? modes.find((m) => m !== mode) : undefined;

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

  const heading1 = props.heading1 ?? (mode === 'spelling' ? 'Graphemes' : mode === 'sound' ? 'Phonemes' : 'Prefixes');
  const heading2 = props.heading2 ?? (mode === 'spelling' ? 'Phonemes' : mode === 'sound' ? 'Graphemes' : 'Suffixes');
  const showMore = !search.trim() && allGraphemes.length > shortList.filter((g) => allGraphemes.includes(g)).length;

  return (
    <div className="picker">
      {props.closedNote ? (
        <p className="picker-closed">{props.closedNote}</p>
      ) : (
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

            {mode === 'spelling' && (
              <div className="grid scroll swap-part" role="listbox" aria-label={heading1}>
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
                {showMore && (
                  <button type="button" className="cell" title={showAll ? 'Show the short list' : `Show all ${allGraphemes.length}`} onClick={() => setShowAll(!showAll)}>
                    {showAll ? '‹' : '…'}
                  </button>
                )}
                {search.trim() && graphemeCells.length === 0 && <div className="grid-note">Nothing here has those letters.</div>}
                {blanks(graphemeCells.length + (showMore ? 1 : 0), 16)}
              </div>
            )}

            {mode === 'sound' && (
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
                  placeholder={props.searchPlaceholder ?? (mode === 'spelling' ? 'Search Letter Pattern' : 'Search Sound')}
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
              <span className="swap-part">{heading2}</span>
            </h2>

            {mode !== 'part' ? (
              <div className="grid scroll swap-part" aria-label={heading2}>
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

          {/* Swaps steps 1 and 2: start with spellings, or start with sounds. */}
          {otherMode && (
            <button
              type="button"
              className={mode === 'sound' ? 'swap flipped' : 'swap'}
              title={`Swap steps 1 and 2: start with a ${MODE_LABEL[otherMode]}`}
              aria-label={`Swap steps 1 and 2: start with a ${MODE_LABEL[otherMode]}`}
              onClick={swapSteps}
            >
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <path d="M1 5h11M9 2l3 3-3 3M15 11H4M7 8l-3 3 3 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

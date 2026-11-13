// Step 4: the word list panel, with sorting, Options, the word count,
// "Filter Words", and export (copy, spreadsheet file, print).

import { Fragment, useEffect, useMemo, useState } from 'react';
import { formatFrequency, gpcLabel, gpcsOf, type Dataset } from '../lib/dataset';
import { filterSummary, filtersAreDefault, sameFilters } from '../lib/edit';
import type { Morph } from '../lib/morph';
import type { Notation } from '../lib/phonemeMeta';
import { defaultFilters, hasCriteria, SORTS, type Filters, type Query, type SortKey } from '../lib/query';
import { matchedPositions } from '../lib/search';
import type { Stats } from '../lib/stats';
import { FREQUENCY_STOPS, RangeButtons, RangeSlider } from './RangeControls';

const PAGE = 200;
const MIN_ROWS = 10; // the panel keeps its height when the list is short, as before

interface Props {
  ds: Dataset;
  stats: Stats;
  morph: Morph;
  query: Query;
  notation: Notation;
  sort: SortKey;
  /** Sorted matches (word indexes), before "Filter Words" is applied. */
  results: number[];
  totalWords: number;
  /** What to say when nothing has been chosen yet. */
  emptyHint: string;
  /** The limits this kind of list starts with. The line above the list appears only when the limits differ from these. */
  startFilters: Filters;
  onSort: (s: SortKey) => void;
  onFilters: (f: Filters) => void;
  onWordSet: (s: Query['wordSet']) => void;
  onExplore: (word: string) => void;
  onExport: (kind: 'copy' | 'csv' | 'print-list' | 'print-cards', indexes: number[]) => void;
}

export function WordList(props: Props) {
  const { ds, query, notation, sort, results } = props;
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [text, setText] = useState('');
  const [shown, setShown] = useState(PAGE);

  const visible = useMemo(() => {
    const t = text.trim().toLowerCase();
    return t ? results.filter((i) => ds.word[i].includes(t)) : results;
  }, [results, text, ds]);

  useEffect(() => setShown(PAGE), [results, text]);

  const highlight = useMemo(() => [...query.all, ...query.any], [query.all, query.any]);
  const affixes = useMemo(
    () => [...query.all, ...query.any].flatMap((c) => (c.type === 'affix' ? [c.affix] : [])),
    [query.all, query.any],
  );
  const limits = sameFilters(query.filters, props.startFilters) && query.wordSet === 'all' ? [] : filterSummary(query.filters, query.wordSet);
  const searching = hasCriteria(query);
  const sortLabel = SORTS.find((s) => s.key === sort)!.label;

  return (
    <section className="wordlist" aria-label="Word list">
      <h2 className="heading">
        <span className="num">4</span>Word List
      </h2>

      <div className="panel">
        <div className="panel-head">
          {!optionsOpen ? (
            <div className="dropdown">
              <button type="button" className="link" aria-haspopup="listbox" aria-expanded={sortOpen} onClick={() => setSortOpen(!sortOpen)} onBlur={() => setTimeout(() => setSortOpen(false), 150)}>
                {sortLabel}
              </button>
              {sortOpen && (
                <ul className="dropdown-menu" role="listbox">
                  {SORTS.map((s) => (
                    <li key={s.key}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={s.key === sort}
                        disabled={s.key === sort}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          props.onSort(s.key);
                          setSortOpen(false);
                        }}
                      >
                        {s.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <span />
          )}
          <button type="button" className="link options-toggle" aria-expanded={optionsOpen} onClick={() => setOptionsOpen(!optionsOpen)}>
            Options {optionsOpen ? '▴' : '▾'}
          </button>
        </div>

        {optionsOpen ? (
          <Options {...props} onDone={() => setOptionsOpen(false)} />
        ) : (
          <>
            {limits.length > 0 && (
              <div className="limits">
                Showing words with {limits.join(', ')}.{' '}
                <button type="button" className="link small" onClick={() => setOptionsOpen(true)}>
                  Change
                </button>
              </div>
            )}
            <div className="list" tabIndex={0}>
              <table>
                <tbody>
                  {visible.slice(0, shown).map((i) => {
                    const seq = ds.seq[i];
                    const hit = highlight.length ? matchedPositions(ds, seq, highlight) : null;
                    const parts = affixes.flatMap((id) => {
                      const h = props.morph.hitsByWord(id).get(i);
                      if (!h) return [];
                      return [id.startsWith('pre-') ? `${h.form} + ${ds.word[h.base]}` : `${ds.word[h.base]} + ${h.form}`];
                    });
                    return (
                      <tr key={i}>
                        <td className="w">
                          <button type="button" className="word" title="Explore this word" onClick={() => props.onExplore(ds.word[i])}>
                            {ds.word[i]}
                          </button>
                        </td>
                        <td className="ph">
                          {gpcsOf(ds, seq).map((g, k) => (
                            <Fragment key={k}>
                              <span className={hit?.has(k) ? 'gpc hit' : 'gpc'}>{gpcLabel(g, notation)}</span>{' '}
                            </Fragment>
                          ))}
                          {parts.length > 0 && <span className="parts">[{parts.join('; ')}]</span>}
                        </td>
                        <td className="f">
                          {!Number.isNaN(ds.freq[i]) && (
                            <span className="badge" title={`${formatFrequency(ds.freq[i])} per million words (Fitt, 2000)`}>
                              {formatFrequency(ds.freq[i])}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {Array.from({ length: Math.max(0, MIN_ROWS - visible.length) }, (_, k) => (
                    <tr key={`blank${k}`} aria-hidden>
                      <td colSpan={3}>&nbsp;</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visible.length > shown && (
                <button type="button" className="more" onClick={() => setShown(shown + PAGE * 5)}>
                  Show more ({(visible.length - shown).toLocaleString()} more words)
                </button>
              )}
              {visible.length === 0 && (
                <div className="list-empty">
                  {!searching
                    ? props.emptyHint
                    : text.trim()
                      ? 'No words in the list have those letters.'
                      : 'No results found'}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="list-foot">
        <div className="count">
          <b>Word Count:</b> {visible.length.toLocaleString()}
          {text.trim() && results.length !== visible.length && <span className="count-of"> of {results.length.toLocaleString()}</span>}
        </div>
        <div className="exports" aria-label="Export the word list">
          {(
            [
              ['copy', 'Copy'],
              ['csv', 'Spreadsheet'],
              ['print-list', 'Print list'],
              ['print-cards', 'Print cards'],
            ] as const
          ).map(([kind, label]) => (
            <button key={kind} type="button" className="link small" disabled={visible.length === 0} onClick={() => props.onExport(kind, visible)}>
              {label}
            </button>
          ))}
        </div>
        <input type="text" className="inputform filter" value={text} onChange={(e) => setText(e.target.value)} placeholder="Filter Words" aria-label="Filter words" />
      </div>
    </section>
  );
}

// ---- Options ---------------------------------------------------------------

const SYLLABLES = [1, 2, 3, 4, 5, 6, 7, 8];
const LETTERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const FREQUENCY_LABELS = [0, 1, 10, 100, 1000, 10000, Infinity];
const frequencyText = (v: number) => (v >= 1000 ? v.toLocaleString('en-US') : String(v));

/** "1 to 100 per million words", or "Any frequency" when no limit is set. */
function frequencySummary(min: number | null, max: number | null): string {
  if (min === null && max === null) return 'Any frequency';
  const range = min !== null && max !== null ? `${frequencyText(min)} to ${frequencyText(max)}` : min !== null ? `${frequencyText(min)} or more` : `Up to ${frequencyText(max!)}`;
  return `${range} per million words`;
}

function Options(props: Props & { onDone: () => void }) {
  const { query, stats, totalWords } = props;
  const f = query.filters;
  const set = (patch: Partial<Filters>) => props.onFilters({ ...f, ...patch });

  return (
    <div className="options">
      <div className="opt">
        <strong>Syllables</strong>
        <RangeButtons values={SYLLABLES} min={f.syllablesMin} max={f.syllablesMax} unit="syllable" onChange={(min, max) => set({ syllablesMin: min, syllablesMax: max })} />
      </div>
      <div className="opt">
        <strong>Letters</strong>
        <RangeButtons values={LETTERS} min={f.lettersMin} max={f.lettersMax} unit="letter" onChange={(min, max) => set({ lettersMin: min, lettersMax: max })} />
      </div>
      <div className="opt freq">
        <strong title="Frequency per million words, from Fitt (2000)">Frequency</strong>
        <div className="freq-controls">
          <div className="range-summary">
            {frequencySummary(f.frequencyMin, f.frequencyMax)}
            {(f.frequencyMin !== null || f.frequencyMax !== null) && <span className="range-hint"> &middot; words with no frequency value are left out</span>}
          </div>
          <RangeSlider
            stops={FREQUENCY_STOPS}
            labels={FREQUENCY_LABELS}
            min={f.frequencyMin}
            max={f.frequencyMax}
            onChange={(min, max) => set({ frequencyMin: min, frequencyMax: max })}
            format={frequencyText}
            ariaLabel="Frequency range, per million words"
          />
        </div>
      </div>
      <div className="opt">
        <strong>Word Set</strong>
        <label className="check">
          <input type="checkbox" checked={query.wordSet === 'freq'} onChange={(e) => props.onWordSet(e.target.checked ? 'freq' : 'all')} />
          Only words that have a frequency value
          {query.wordSet === 'freq' && (
            <span className="muted">
              {' '}
              ({stats.nWords.toLocaleString()} of {totalWords.toLocaleString()} words)
            </span>
          )}
        </label>
      </div>
      <div className="opt-actions">
        <button type="button" className="apply" onClick={props.onDone}>
          Done
        </button>
        <button
          type="button"
          className="cancel"
          disabled={filtersAreDefault(f) && query.wordSet === 'all'}
          title="Remove every limit and use all words"
          onClick={() => {
            props.onFilters(defaultFilters());
            props.onWordSet('all');
          }}
        >
          Clear limits
        </button>
      </div>
    </div>
  );
}

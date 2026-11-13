// Step 4: the word list panel, with sorting, Options, the word count,
// "Filter Words", and export (copy, spreadsheet file, print).

import { Fragment, useEffect, useMemo, useState } from 'react';
import { formatFrequency, gpcLabel, gpcsOf, type Dataset } from '../lib/dataset';
import { filterSummary, filtersAreDefault } from '../lib/edit';
import type { Morph } from '../lib/morph';
import type { Notation } from '../lib/phonemeMeta';
import { defaultFilters, emptyFilters, hasCriteria, SORTS, type Filters, type Query, type SortKey } from '../lib/query';
import { matchedPositions } from '../lib/search';
import type { Stats } from '../lib/stats';

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
  const limits = filterSummary(query.filters, query.wordSet);
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
                        <td className="f">{!Number.isNaN(ds.freq[i]) && <span className="badge">{formatFrequency(ds.freq[i])}</span>}</td>
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

function NumberBox({ value, onChange, label, min = 0 }: { value: number | null; onChange: (v: number | null) => void; label: string; min?: number }) {
  return (
    <input
      type="number"
      className="num-box"
      aria-label={label}
      min={min}
      value={value ?? ''}
      placeholder="any"
      onChange={(e) => {
        const v = e.target.value.trim();
        onChange(v === '' || Number.isNaN(Number(v)) ? null : Math.max(min, Number(v)));
      }}
    />
  );
}

function Options(props: Props & { onDone: () => void }) {
  const { query, stats, totalWords } = props;
  const f = query.filters;
  const set = (patch: Partial<Filters>) => props.onFilters({ ...f, ...patch });

  const buttonRow = (field: 'syllablesMax' | 'lettersMax', values: number[], label: string) => (
    <div className="btn-row" role="group" aria-label={label}>
      {values.map((v) => (
        <button key={v} type="button" className={f[field] === v ? 'on' : ''} aria-pressed={f[field] === v} onClick={() => set({ [field]: v })}>
          {v}
        </button>
      ))}
      <button type="button" className={f[field] === null ? 'on' : ''} aria-pressed={f[field] === null} onClick={() => set({ [field]: null })}>
        Any
      </button>
    </div>
  );

  const freqPresets: [string, number | null, number | null][] = [
    ['Any', null, null],
    ['1 or higher', 1, null],
    ['10 or higher', 10, null],
    ['100 or higher', 100, null],
  ];

  return (
    <div className="options">
      <div className="opt">
        <strong>Max Syllables</strong>
        {buttonRow('syllablesMax', [1, 2, 3, 4, 5, 6, 7, 8], 'Maximum syllables')}
      </div>
      <div className="opt">
        <strong>Max Letters</strong>
        {buttonRow('lettersMax', [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], 'Maximum letters')}
      </div>
      <div className="opt">
        <strong>Min Syllables</strong>
        <span className="inline">
          <NumberBox value={f.syllablesMin} onChange={(v) => set({ syllablesMin: v })} label="Minimum syllables" min={1} />
          <strong className="gap">Min Letters</strong>
          <NumberBox value={f.lettersMin} onChange={(v) => set({ lettersMin: v })} label="Minimum letters" min={1} />
        </span>
      </div>
      <div className="opt">
        <strong>Frequency Range</strong>
        <span className="inline">
          <NumberBox value={f.frequencyMin} onChange={(v) => set({ frequencyMin: v })} label="Lowest frequency" />
          <span>to</span>
          <NumberBox value={f.frequencyMax} onChange={(v) => set({ frequencyMax: v })} label="Highest frequency" />
          <span className="presets">
            {freqPresets.map(([label, lo, hi]) => (
              <button key={label} type="button" className={f.frequencyMin === lo && f.frequencyMax === hi ? 'link small on' : 'link small'} onClick={() => set({ frequencyMin: lo, frequencyMax: hi })}>
                {label}
              </button>
            ))}
          </span>
        </span>
      </div>
      <div className="opt">
        <strong>Word Set</strong>
        <label className="check">
          <input type="checkbox" checked={query.wordSet === 'freq'} onChange={(e) => props.onWordSet(e.target.checked ? 'freq' : 'all')} />
          Only words that have a frequency value
          <span className="muted">
            {' '}
            ({query.wordSet === 'freq' ? `${stats.nWords.toLocaleString()} of ${totalWords.toLocaleString()} words` : `off: all ${totalWords.toLocaleString()} words`})
          </span>
        </label>
      </div>
      <p className="opt-note">Changes apply right away. A frequency range leaves out words that have no frequency value.</p>
      <div className="opt-actions">
        <button type="button" className="apply" onClick={props.onDone}>
          Done
        </button>
        <button
          type="button"
          className="cancel"
          disabled={filtersAreDefault(f) && query.wordSet === 'all'}
          title="Back to 4 syllables, 10 letters, any frequency, all words"
          onClick={() => {
            props.onFilters(defaultFilters());
            props.onWordSet('all');
          }}
        >
          Reset
        </button>
        <button
          type="button"
          className="cancel"
          title="Remove every limit"
          onClick={() => {
            props.onFilters(emptyFilters());
            props.onWordSet('all');
          }}
        >
          No limits
        </button>
      </div>
    </div>
  );
}

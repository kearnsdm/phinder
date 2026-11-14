import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import config from '../pack.config.json';
import trial from '../trial.json';
import { Explore } from './components/Explore';
import { Help } from './components/Help';
import { Picker, type PickerMode } from './components/Picker';
import { PrintSheet, type PrintMode } from './components/PrintSheet';
import { Selection } from './components/Selection';
import { WordList } from './components/WordList';
import { inlineAssets, loadDataset, type Dataset } from './lib/dataset';
import {
  addAffix,
  addCriterion,
  addGpc,
  criterionLabel,
  describeQuery,
  joinWithNext,
  removeAt,
  setKeepsSound,
  setPosition,
  splitUnit,
  type Row,
} from './lib/edit';
import { resultsToCsv, resultsToText } from './lib/export';
import { Morph } from './lib/morph';
import { defaultFilters, emptyQuery, hasCriteria, SHAPES, type Criterion, type Query } from './lib/query';
import { search, sortResults } from './lib/search';
import { computeStats } from './lib/stats';
import { decodeState, defaultState, encodeState, type AppState, type Task } from './lib/urlState';

type Alert = { kind: 'ok' | 'bad'; text: string; id: number };

const LOGO = inlineAssets().logo ?? `${import.meta.env.BASE_URL}logo.png`;
const SITE = 'https://www.devinkearns.com/';

/**
 * The pages of the word-list screen, in the order of the top line. The
 * titles follow one pattern: the two directions first (Spelling to Sound,
 * Sound to Spelling), then three noun phrases.
 *   find:      the first Phinder's screen (spelling to sound), plus word parts
 *   sound:     the same steps the other way round (sound to spelling)
 *   decodable: words made only from the sound spellings students know
 *   advanced:  every other way to select words
 * Each page keeps a search of its own.
 */
const PAGES: [Task, string][] = [
  ['find', 'Spelling to Sound'],
  ['sound', 'Sound to Spelling'],
  ['decodable', 'Decodable Words'],
  ['advanced', 'Advanced Search'],
];

const startQueries = (): Record<Task, Query> => ({
  find: { ...emptyQuery(), filters: defaultFilters() },
  sound: { ...emptyQuery(), filters: defaultFilters() },
  decodable: { ...emptyQuery(), filters: defaultFilters(), decodable: true },
  advanced: { ...emptyQuery(), filters: defaultFilters() },
});

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers, and pages not served over https.
    const box = document.createElement('textarea');
    box.value = text;
    box.style.position = 'fixed';
    box.style.opacity = '0';
    document.body.appendChild(box);
    box.select();
    const ok = document.execCommand('copy');
    box.remove();
    return ok;
  }
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function App() {
  const [ds, setDs] = useState<Dataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<AppState>(defaultState);
  /** The searches of the pages that are not showing. */
  const stash = useRef<Record<Task, Query>>(startQueries());
  const [activeRow, setActiveRow] = useState<Row>('all');
  const [openRows, setOpenRows] = useState<Row[]>([]);
  const [advancedMode, setAdvancedMode] = useState<PickerMode>('spelling');
  const [help, setHelp] = useState(false);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [history, setHistory] = useState<Criterion[]>([]);
  const [print, setPrint] = useState<{ mode: PrintMode; indexes: number[] } | null>(null);

  // ---- load the word data, then read the search from the address ----
  useEffect(() => {
    let cancelled = false;
    loadDataset(`${import.meta.env.BASE_URL}${config.file}`)
      .then((data) => {
        if (cancelled) return;
        const initial = decodeState(data, window.location.hash);
        setState(initial);
        setActiveRow(initial.task === 'decodable' ? 'taught' : 'all');
        setDs(data);
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'The word data could not be loaded.'));
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- keep the address in step with the search (this is what "Copy link" shares) ----
  const lastPage = useRef('');
  useEffect(() => {
    if (!ds) return;
    const hash = encodeState(ds, state);
    if (window.location.hash.replace(/^#/, '') === hash) return;
    const url = hash ? `#${hash}` : window.location.pathname + window.location.search;
    // Moving between the word list and a word makes a Back step; edits to a search do not.
    const page = `${state.view}:${state.exploreWord}`;
    try {
      if (lastPage.current && lastPage.current !== page) window.history.pushState(null, '', url);
      else window.history.replaceState(null, '', url);
    } catch {
      // Some browsers refuse this for a page opened from disk. The search still works; only the address is stale.
    }
    lastPage.current = page;
  }, [ds, state]);

  useEffect(() => {
    if (!ds) return;
    const onPop = () => {
      const next = decodeState(ds, window.location.hash);
      lastPage.current = `${next.view}:${next.exploreWord}`;
      setState(next);
      setActiveRow(next.task === 'decodable' ? 'taught' : 'all');
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onPop);
    };
  }, [ds]);

  // ---- alerts fade, as before ----
  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 3500);
    return () => clearTimeout(t);
  }, [alert]);
  const say = (kind: Alert['kind'], text: string) => setAlert({ kind, text, id: Date.now() });

  // ---- printing ----
  useEffect(() => {
    if (!print) return;
    const done = () => setPrint(null);
    window.addEventListener('afterprint', done);
    const t = setTimeout(() => window.print(), 50);
    return () => {
      clearTimeout(t);
      window.removeEventListener('afterprint', done);
    };
  }, [print]);

  const { query, notation, sort, task } = state;
  const morph = useMemo(() => (ds ? new Morph(ds) : null), [ds]);
  const stats = useMemo(() => (ds ? computeStats(ds, query.wordSet) : null), [ds, query.wordSet]);
  const results = useMemo(() => (ds && morph ? sortResults(ds, search(ds, query, morph), sort) : []), [ds, morph, query, sort]);

  const setQuery = useCallback((fn: (q: Query) => Query) => setState((s) => ({ ...s, query: fn(s.query) })), []);
  const remember = (c: Criterion) =>
    setHistory((h) => [c, ...h.filter((x) => JSON.stringify(x) !== JSON.stringify(c))].slice(0, 8));

  if (error) {
    return (
      <div className="container">
        <p className="load-note bad">{error} Reload the page to try again.</p>
      </div>
    );
  }
  if (!ds || !morph || !stats) {
    return (
      <div className="container">
        <img className="logo" src={LOGO} alt="Phinder" width={106} height={65} />
        <p className="load-note">Loading the word list&hellip;</p>
      </div>
    );
  }

  // ---- pages ----
  /** Shows a page. `withQuery` replaces that page's search (used by the Word Explorer). */
  const openPage = (next: Task, withQuery?: Query) => {
    if (!withQuery && next === task && state.view === 'find') return;
    if (next !== task) stash.current[task] = query;
    const nextQuery = withQuery ?? (next === task ? query : stash.current[next]);
    setState((s) => ({ ...s, view: 'find', task: next, query: nextQuery }));
    setActiveRow(next === 'decodable' ? 'taught' : 'all');
    setOpenRows([]);
  };
  /** The search of the "Decodable Words" page, wherever the person is now. */
  const decodableQuery = task === 'decodable' ? query : stash.current.decodable;
  const advanced = task === 'advanced';

  // ---- choices from the grids and menus ----
  const pickGpc = (id: number) => {
    setQuery((q) => addGpc(q, activeRow, id));
    remember({ type: 'unit', gpcs: [id], position: 'any' });
  };
  const pickAffix = (affix: string) => {
    const row = activeRow === 'taught' ? 'all' : activeRow;
    setActiveRow(row);
    setQuery((q) => addAffix(q, row, affix));
    remember({ type: 'affix', affix, keepsSound: true });
  };

  const openRow = (row: Row) => {
    setOpenRows((rows) => (rows.includes(row) ? rows : [...rows, row]));
    setActiveRow(row);
  };
  const closeRow = (row: Row) => {
    if (row !== 'taught') setQuery((q) => ({ ...q, [row]: [] }));
    setOpenRows((rows) => rows.filter((r) => r !== row));
    setActiveRow(task === 'decodable' ? 'taught' : 'all');
  };

  const onSearch = () => {
    if (!hasCriteria(query)) say('bad', task === 'decodable' ? 'Choose the sound spellings your students know' : 'Select one or more phonemes');
    else if (results.length === 0) say('bad', 'No results found');
    else say('ok', 'Done!');
    if (window.innerWidth < 900) document.querySelector('.wordlist')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const onExport = async (kind: 'copy' | 'csv' | 'print-list' | 'print-cards', indexes: number[]) => {
    if (kind === 'copy') {
      const ok = await copyText(resultsToText(ds, indexes));
      say(ok ? 'ok' : 'bad', ok ? `Copied ${indexes.length.toLocaleString()} words` : 'The words could not be copied');
    } else if (kind === 'csv') {
      download('phinder-word-list.csv', resultsToCsv(ds, indexes, notation), 'text/csv;charset=utf-8');
    } else {
      setPrint({ mode: kind === 'print-list' ? 'list' : 'cards', indexes });
    }
  };

  const copyLink = async () => {
    const ok = await copyText(window.location.href);
    say(ok ? 'ok' : 'bad', ok ? 'Link copied. It reopens this search.' : 'The link could not be copied');
  };

  const clearAll = () => {
    setQuery((q) => ({ ...q, all: [], any: [], none: [], shape: null }));
    setOpenRows([]);
    setActiveRow(task === 'decodable' ? 'taught' : 'all');
  };

  const setWordSet = (wordSet: Query['wordSet']) => {
    // One choice for every page.
    for (const page of Object.keys(stash.current) as Task[]) stash.current[page] = { ...stash.current[page], wordSet };
    setQuery((q) => ({ ...q, wordSet }));
  };

  const explore = (word: string) => setState((s) => ({ ...s, view: 'explore', exploreWord: word }));
  const showList = () => setState((s) => ({ ...s, view: 'find' }));
  /** From the Word Explorer. A joined unit (a body or a rime) needs the Advanced Search page. */
  const findFromExplore = (criteria: Criterion[], oneSyllable?: boolean) => {
    const needsAdvanced = criteria.some((c) => c.type === 'unit' && (c.gpcs.length > 1 || c.position !== 'any'));
    const page: Task = needsAdvanced ? 'advanced' : 'find';
    const filters = oneSyllable ? { ...defaultFilters(), syllablesMax: 1 } : defaultFilters();
    openPage(page, { ...startQueries()[page], wordSet: query.wordSet, all: criteria, filters });
  };

  const anySelected = query.all.length + query.any.length + query.none.length > 0 || query.shape !== null;
  const emptyHint =
    task === 'decodable'
      ? 'Choose the sound spellings your students know to list the words they can read.'
      : task === 'sound'
        ? 'Choose a phoneme, then a grapheme, to make a word list.'
        : 'Choose a grapheme, then a phoneme, to make a word list.';

  return (
    <div className="container">
      <header className="top">
        <div className="brand">
          <img className="logo" src={LOGO} alt="Phinder" width={106} height={65} />
          <a className="byline" href={SITE} target="_blank" rel="noopener">
            by Devin Kearns, Ph.D.
          </a>
        </div>
        {/* The top line: the pages of the word-list screen, and the single-word screen. */}
        <nav className="views" aria-label="Pages">
          {PAGES.map(([t, label]) => {
            const on = state.view === 'find' && task === t;
            return (
              <button key={t} type="button" className={on ? 'link on' : 'link'} aria-current={on ? 'page' : undefined} onClick={() => openPage(t)}>
                {label}
              </button>
            );
          })}
          <button
            type="button"
            className={state.view === 'explore' ? 'link on' : 'link'}
            aria-current={state.view === 'explore' ? 'page' : undefined}
            onClick={() => setState((s) => ({ ...s, view: 'explore' }))}
          >
            Word Explorer
          </button>
        </nav>
      </header>

      {state.view === 'find' ? (
        <div className="main">
          <div className="left">
            <Picker
              key={task}
              ds={ds}
              stats={stats}
              notation={notation}
              mode={task === 'sound' ? 'sound' : advanced ? advancedMode : 'spelling'}
              modes={advanced ? ['spelling', 'sound'] : [task === 'sound' ? 'sound' : 'spelling']}
              onMode={setAdvancedMode}
              onNotation={(n) => setState((s) => ({ ...s, notation: n }))}
              onPickGpc={pickGpc}
              onPickAffix={task === 'find' || advanced ? pickAffix : undefined}
              onHelp={() => setHelp(true)}
              shortList={task === 'decodable' ? LETTERS : undefined}
            />

            <div className="selection-wrap">
              <Selection
                ds={ds}
                query={query}
                notation={notation}
                variant={task === 'decodable' ? 'decodable' : 'search'}
                heading={task === 'decodable' ? 'Sound Spellings My Students Know' : 'Sound Spellings Selected'}
                activeRow={activeRow}
                openRows={openRows}
                addableRows={advanced ? ['any', 'none'] : task === 'decodable' ? ['all'] : []}
                advanced={advanced}
                onActivate={setActiveRow}
                onOpenRow={openRow}
                onCloseRow={closeRow}
                onRemove={(row, index) => setQuery((q) => removeAt(q, row, index))}
                onJoin={(row, index) => {
                  const next = joinWithNext(query, row, index);
                  setQuery(() => next);
                  if (next[row][index]) remember(next[row][index]);
                  say('ok', 'Combined!');
                }}
                onSplit={(row, index) => setQuery((q) => splitUnit(q, row, index))}
                onPosition={(row, index, p) => setQuery((q) => setPosition(q, row, index, p))}
                onKeepsSound={(row, index, v) => setQuery((q) => setKeepsSound(q, row, index, v))}
                onClearTaught={() => setQuery((q) => ({ ...q, taught: [] }))}
              />

              {advanced && (
                <div className="shape-row">
                  <div className="shape-label" title="C = one consonant sound spelling (b, sh, ck). V = one vowel sound spelling (a, ai, ar). e = the final e of a vowel-consonant-e pattern (make, have, some).">
                    Word shape
                  </div>
                  <div className="btn-row" role="group" aria-label="Word shape">
                    {SHAPES.map((shape) => (
                      <button key={shape} type="button" className={query.shape === shape ? 'on' : ''} aria-pressed={query.shape === shape} onClick={() => setQuery((q) => ({ ...q, shape: q.shape === shape ? null : shape }))}>
                        {shape}
                      </button>
                    ))}
                    <button type="button" className={query.shape === null ? 'on' : ''} aria-pressed={query.shape === null} onClick={() => setQuery((q) => ({ ...q, shape: null }))}>
                      Any
                    </button>
                  </div>
                </div>
              )}

              {history.length > 0 && (
                <div className="history" aria-label="History">
                  <div className="history-title">History</div>
                  {history.map((c, k) => (
                    <button key={k} type="button" className="history-item spelling" title="Add this again" onClick={() => setQuery((q) => addCriterion(q, activeRow, c))}>
                      {criterionLabel(ds, c, notation)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="search-row">
              <button type="button" id="search" onClick={onSearch}>
                Search for Words
              </button>
              <div className="search-links">
                <button type="button" className="link small" onClick={copyLink}>
                  Copy link
                </button>
                <button type="button" className="link small" disabled={!anySelected} onClick={clearAll}>
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="right">
            <WordList
              ds={ds}
              stats={stats}
              morph={morph}
              query={query}
              notation={notation}
              sort={sort}
              results={results}
              totalWords={ds.n}
              emptyHint={emptyHint}
              startFilters={defaultFilters()}
              onSort={(s) => setState((st) => ({ ...st, sort: s }))}
              onFilters={(f) => setQuery((q) => ({ ...q, filters: f }))}
              onWordSet={setWordSet}
              onExplore={explore}
              onExport={onExport}
            />
            <div className="alert-slot" aria-live="polite">
              {alert && (
                <div key={alert.id} className={`alert ${alert.kind}`}>
                  {alert.text}
                  <button type="button" className="alert-x" aria-label="Dismiss" onClick={() => setAlert(null)}>
                    &times;
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <Explore
          ds={ds}
          stats={stats}
          morph={morph}
          query={decodableQuery}
          notation={notation}
          word={state.exploreWord}
          onWord={(w) => setState((s) => ({ ...s, exploreWord: w }))}
          onBack={showList}
          onFind={findFromExplore}
        />
      )}

      <footer>
        &copy; {new Date().getFullYear()}, Devin Kearns, Michael Li, Steven Li. This website is for non-commercial use only.{' '}
        <a href={`${SITE}contact/`} target="_blank" rel="noopener">
          <b>Contact us</b>
        </a>{' '}
        with questions or suggestions.
        <span className="trial"> &middot; Trial {trial.trial}</span>
      </footer>

      {help && <Help onClose={() => setHelp(false)} />}
      {print && <PrintSheet ds={ds} mode={print.mode} indexes={print.indexes} title={describeQuery(ds, query, notation)} />}
    </div>
  );
}

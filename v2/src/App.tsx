import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import config from '../pack.config.json';
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
import { hasCriteria, type Criterion, type Query } from './lib/query';
import { search, sortResults } from './lib/search';
import { computeStats } from './lib/stats';
import { decodeState, defaultState, encodeState, type AppState } from './lib/urlState';

type Alert = { kind: 'ok' | 'bad'; text: string; id: number };

const LOGO = inlineAssets().logo ?? `${import.meta.env.BASE_URL}logo.png`;

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
  const [activeRow, setActiveRow] = useState<Row>('all');
  const [advanced, setAdvanced] = useState(false);
  const [mode, setMode] = useState<PickerMode>('spelling');
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
        setAdvanced(initial.query.any.length > 0 || initial.query.none.length > 0);
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

  const { query, notation, sort } = state;
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
        <img className="logo" src={LOGO} alt="Phinder" width={130} height={80} />
        <p className="load-note">Loading the word list&hellip;</p>
      </div>
    );
  }

  const pickGpc = (id: number) => {
    const unit: Criterion = { type: 'unit', gpcs: [id], position: 'any' };
    setQuery((q) => addGpc(q, activeRow, id));
    remember(unit);
  };
  const pickAffix = (affix: string) => {
    const row = activeRow === 'taught' ? 'all' : activeRow;
    setActiveRow(row);
    setQuery((q) => addAffix(q, row, affix));
    remember({ type: 'affix', affix, keepsSound: true });
  };

  const toggleAdvanced = (on: boolean) => {
    setAdvanced(on);
    if (!on) {
      // Hidden rows must not keep shaping the list.
      setQuery((q) => ({ ...q, any: [], none: [] }));
      if (activeRow === 'any' || activeRow === 'none') setActiveRow('all');
    }
  };
  const toggleDecodable = (on: boolean) => {
    setQuery((q) => ({ ...q, decodable: on }));
    setActiveRow(on ? 'taught' : 'all');
  };

  const onSearch = () => {
    if (!hasCriteria(query)) say('bad', query.decodable ? 'Choose the sound spellings your students know' : 'Select one or more phonemes');
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
    setQuery((q) => ({ ...q, all: [], any: [], none: [] }));
    setActiveRow(query.decodable ? 'taught' : 'all');
  };

  const explore = (word: string) => setState((s) => ({ ...s, view: 'explore', exploreWord: word }));
  const showList = () => setState((s) => ({ ...s, view: 'find' }));
  const findFromExplore = (criteria: Criterion[], oneSyllable?: boolean) => {
    setAdvanced(false);
    setActiveRow('all');
    setState((s) => ({
      ...s,
      view: 'find',
      query: {
        ...s.query,
        all: criteria,
        any: [],
        none: [],
        filters: oneSyllable ? { ...s.query.filters, syllablesMin: null, syllablesMax: 1 } : s.query.filters,
      },
    }));
  };

  const anySelected = query.all.length + query.any.length + query.none.length > 0;

  return (
    <div className="container">
      <header className="top">
        <img className="logo" src={LOGO} alt="Phinder" width={130} height={80} />
        <nav className="views" aria-label="Screens">
          <button type="button" className={state.view === 'find' ? 'link on' : 'link'} onClick={showList}>
            Word List
          </button>
          <button type="button" className={state.view === 'explore' ? 'link on' : 'link'} onClick={() => setState((s) => ({ ...s, view: 'explore' }))}>
            Explore a Word
          </button>
        </nav>
      </header>

      {state.view === 'find' ? (
        <div className="main">
          <div className="left">
            <Picker
              ds={ds}
              stats={stats}
              notation={notation}
              mode={mode}
              onMode={setMode}
              onNotation={(n) => setState((s) => ({ ...s, notation: n }))}
              onPickGpc={pickGpc}
              onPickAffix={pickAffix}
              onHelp={() => setHelp(true)}
            />

            <div className="selection-wrap">
              <Selection
                ds={ds}
                query={query}
                notation={notation}
                activeRow={activeRow}
                advanced={advanced}
                onActivate={setActiveRow}
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
              <label className="check" title="Adds an OR row (at least one of these) and a NOT row (none of these)">
                <input type="checkbox" checked={advanced} onChange={(e) => toggleAdvanced(e.target.checked)} />
                <b>Advanced</b>
              </label>
            </div>
            <div className="search-links">
              <label className="check" title="Show only words in which every sound spelling is one your students know">
                <input type="checkbox" checked={query.decodable} onChange={(e) => toggleDecodable(e.target.checked)} />
                <b>Decodable words only</b>
              </label>
              <button type="button" className="link small" onClick={copyLink}>
                Copy link
              </button>
              <button type="button" className="link small" disabled={!anySelected} onClick={clearAll}>
                Clear
              </button>
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
              onSort={(s) => setState((st) => ({ ...st, sort: s }))}
              onFilters={(f) => setQuery((q) => ({ ...q, filters: f }))}
              onWordSet={(w) => setQuery((q) => ({ ...q, wordSet: w }))}
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
        <>
          <Explore
            ds={ds}
            stats={stats}
            morph={morph}
            query={query}
            notation={notation}
            word={state.exploreWord}
            onWord={(w) => setState((s) => ({ ...s, exploreWord: w }))}
            onBack={showList}
            onFind={findFromExplore}
          />
        </>
      )}

      <footer>
        &copy; {new Date().getFullYear()}, Devin Kearns, Michael Li, Steven Li. This website is for non-commercial use only.{' '}
        <a href="mailto:devin.kearns@gmail.com">
          <b>Contact us</b>
        </a>{' '}
        with questions or suggestions.
      </footer>

      {help && <Help onClose={() => setHelp(false)} />}
      {print && <PrintSheet ds={ds} mode={print.mode} indexes={print.indexes} title={describeQuery(ds, query, notation)} />}
    </div>
  );
}

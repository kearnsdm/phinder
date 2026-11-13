import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import config from '../pack.config.json';
import { Explore } from './components/Explore';
import { FamilyBox, type FamilyKind, type FamilyPhase } from './components/FamilyBox';
import { Help } from './components/Help';
import { Picker, type PickerMode } from './components/Picker';
import { PrintSheet, type PrintMode } from './components/PrintSheet';
import { Selection } from './components/Selection';
import { WordList } from './components/WordList';
import { gpcsOf, inlineAssets, loadDataset, type Dataset, type Gpc } from './lib/dataset';
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
import { defaultFilters, emptyQuery, hasCriteria, type Criterion, type Query, type UnitCriterion } from './lib/query';
import { search, sortResults } from './lib/search';
import { computeStats } from './lib/stats';
import { bodyRime } from './lib/units';
import { decodeState, defaultState, encodeState, type AppState, type Task } from './lib/urlState';

type Alert = { kind: 'ok' | 'bad'; text: string; id: number };

const LOGO = inlineAssets().logo ?? `${import.meta.env.BASE_URL}logo.png`;
const SITE = 'https://www.devinkearns.com/';

const TABS: [Task, string][] = [
  ['find', 'Find Words'],
  ['family', 'Word Family'],
  ['decodable', 'Decodable List'],
  ['parts', 'Word Parts'],
];

/**
 * Each tab works on a search. "Find words" and "Word parts" are two ways into
 * the same search; "Word family" and "Decodable list" each keep their own.
 */
type Slot = 'search' | 'family' | 'decodable';
const slotOf = (task: Task): Slot => (task === 'family' ? 'family' : task === 'decodable' ? 'decodable' : 'search');

const startQueries = (): Record<Slot, Query> => ({
  search: { ...emptyQuery(), filters: defaultFilters() },
  family: { ...emptyQuery(), filters: { ...defaultFilters(), syllablesMax: 1 } },
  decodable: { ...emptyQuery(), filters: defaultFilters(), decodable: true },
});

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
const isVowelGpc = (g: Gpc) => g.phoneme.struct === 'V' || g.phoneme.struct === 'VC' || g.phoneme.struct === 'CV';
const isConsonantGpc = (g: Gpc) => !isVowelGpc(g); // consonants and silent letters

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
  /** The searches of the tabs that are not showing. */
  const stash = useRef<Record<Slot, Query>>(startQueries());
  const [activeRow, setActiveRow] = useState<Row>('all');
  const [openRows, setOpenRows] = useState<Row[]>([]);
  const [findMode, setFindMode] = useState<PickerMode>('spelling');
  const [familyKind, setFamilyKind] = useState<FamilyKind>('rime');
  const [bodyWantsVowel, setBodyWantsVowel] = useState(false);
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

  // Graphemes for the "Word family" tab: vowel spellings, and the letters before and after them.
  // The first screen of each grid holds the 15 used most in that place in one-syllable words.
  const familyLists = useMemo(() => {
    if (!ds || !stats) return null;
    const onset = new Map<string, number>();
    const nucleus = new Map<string, number>();
    const coda = new Map<string, number>();
    const bump = (m: Map<string, number>, grapheme: string) => m.set(grapheme, (m.get(grapheme) ?? 0) + 1);
    for (let i = 0; i < ds.n; i++) {
      if (ds.syllables[i] !== 1) continue;
      const parts = bodyRime(gpcsOf(ds, ds.seq[i]));
      if (!parts) continue;
      parts.onset.forEach((g) => bump(onset, g.grapheme));
      bump(nucleus, parts.nucleus.grapheme);
      parts.coda.forEach((g) => bump(coda, g.grapheme));
    }
    const make = (want: (g: Gpc) => boolean, rank: Map<string, number>) => {
      const offered = new Set<string>();
      for (const [grapheme, total] of stats.byGrapheme) {
        if (total.gpcs.some((id) => want(ds.gpcs[id]))) offered.add(grapheme);
      }
      const short = [...offered]
        .filter((g) => rank.has(g))
        .sort((a, b) => rank.get(b)! - rank.get(a)!)
        .slice(0, 15);
      return { filter: (grapheme: string) => offered.has(grapheme), short, want };
    };
    return { vowel: make(isVowelGpc, nucleus), ending: make(isConsonantGpc, coda), beginning: make(isConsonantGpc, onset) };
  }, [ds, stats]);

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
  if (!ds || !morph || !stats || !familyLists) {
    return (
      <div className="container">
        <img className="logo" src={LOGO} alt="Phinder" width={106} height={65} />
        <p className="load-note">Loading the word list&hellip;</p>
      </div>
    );
  }

  // ---- tabs ----
  /** Shows a tab. `withQuery` replaces that tab's search (used by Explore a Word). */
  const openTab = (next: Task, withQuery?: Query) => {
    if (!withQuery && next === task && state.view === 'find') return;
    const from = slotOf(task);
    const to = slotOf(next);
    if (from !== to) stash.current[from] = query;
    const nextQuery = withQuery ?? (from === to ? query : stash.current[to]);
    setState((s) => ({ ...s, view: 'find', task: next, query: nextQuery }));
    setActiveRow(to === 'decodable' ? 'taught' : 'all');
    setOpenRows([]);
  };
  /** The search of the "Decodable list" tab, wherever the person is now. */
  const decodableQuery = slotOf(task) === 'decodable' ? query : stash.current.decodable;

  // ---- word family ----
  const familyUnit: UnitCriterion | null = task === 'family' && query.all[0]?.type === 'unit' ? query.all[0] : null;
  const kind: FamilyKind = familyUnit ? (familyUnit.position === 'start' ? 'body' : 'rime') : familyKind;
  const familyHasVowel = !!familyUnit && familyUnit.gpcs.some((id) => isVowelGpc(ds.gpcs[id]));
  const phase: FamilyPhase =
    kind === 'rime' ? (familyUnit ? 'ending' : 'vowel') : familyHasVowel ? 'done' : bodyWantsVowel ? 'vowel' : 'beginning';
  const pickFamily = (id: number) => {
    setQuery((q) => {
      const unit = q.all[0]?.type === 'unit' ? q.all[0] : null;
      const next: UnitCriterion = unit
        ? { ...unit, gpcs: [...unit.gpcs, id] }
        : { type: 'unit', gpcs: [id], position: kind === 'rime' ? 'end' : 'start' };
      return { ...q, all: [next] };
    });
    setBodyWantsVowel(false);
  };
  const undoFamily = () =>
    setQuery((q) => {
      const unit = q.all[0]?.type === 'unit' ? q.all[0] : null;
      if (!unit || unit.gpcs.length <= 1) return { ...q, all: [] };
      return { ...q, all: [{ ...unit, gpcs: unit.gpcs.slice(0, -1) }] };
    });
  const startOverFamily = () => {
    setQuery((q) => ({ ...q, all: [] }));
    setBodyWantsVowel(false);
  };
  const familyGraphemes = phase === 'vowel' ? familyLists.vowel : phase === 'ending' ? familyLists.ending : familyLists.beginning;

  // ---- choices from the grids ----
  const pickGpc = (id: number) => {
    if (task === 'family') return pickFamily(id);
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
    if (!hasCriteria(query)) {
      say(
        'bad',
        task === 'decodable'
          ? 'Choose the sound spellings your students know'
          : task === 'family'
            ? 'Choose a vowel spelling and an ending'
            : task === 'parts'
              ? 'Select a prefix or a suffix'
              : 'Select one or more phonemes',
      );
    } else if (results.length === 0) say('bad', 'No results found');
    else say('ok', 'Done!');
    if (window.innerWidth < 900) document.querySelector('.wordlist')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const onExport = async (kindOfExport: 'copy' | 'csv' | 'print-list' | 'print-cards', indexes: number[]) => {
    if (kindOfExport === 'copy') {
      const ok = await copyText(resultsToText(ds, indexes));
      say(ok ? 'ok' : 'bad', ok ? `Copied ${indexes.length.toLocaleString()} words` : 'The words could not be copied');
    } else if (kindOfExport === 'csv') {
      download('phinder-word-list.csv', resultsToCsv(ds, indexes, notation), 'text/csv;charset=utf-8');
    } else {
      setPrint({ mode: kindOfExport === 'print-list' ? 'list' : 'cards', indexes });
    }
  };

  const copyLink = async () => {
    const ok = await copyText(window.location.href);
    say(ok ? 'ok' : 'bad', ok ? 'Link copied. It reopens this search.' : 'The link could not be copied');
  };

  const clearAll = () => {
    setQuery((q) => ({ ...q, all: [], any: [], none: [] }));
    setOpenRows([]);
    setBodyWantsVowel(false);
    setActiveRow(task === 'decodable' ? 'taught' : 'all');
  };

  const setWordSet = (wordSet: Query['wordSet']) => {
    // One choice for every tab.
    for (const slot of Object.keys(stash.current) as Slot[]) stash.current[slot] = { ...stash.current[slot], wordSet };
    setQuery((q) => ({ ...q, wordSet }));
  };

  const explore = (word: string) => setState((s) => ({ ...s, view: 'explore', exploreWord: word }));
  const showList = () => setState((s) => ({ ...s, view: 'find' }));
  const findFromExplore = (criteria: Criterion[], family?: boolean) => {
    const base = startQueries()[family ? 'family' : 'search'];
    openTab(family ? 'family' : criteria.some((c) => c.type === 'affix') ? 'parts' : 'find', { ...base, wordSet: query.wordSet, all: criteria });
  };

  const anySelected = query.all.length + query.any.length + query.none.length > 0;
  const emptyHint =
    task === 'family'
      ? 'Choose a vowel spelling and an ending to list a word family.'
      : task === 'decodable'
        ? 'Choose the sound spellings your students know to list the words they can read.'
        : task === 'parts'
          ? 'Choose a prefix or a suffix to make a word list.'
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
        {/* The top line: four kinds of word list, and the single-word screen. */}
        <nav className="views" aria-label="Kinds of word list">
          {TABS.map(([t, label]) => {
            const on = state.view === 'find' && task === t;
            return (
              <button key={t} type="button" className={on ? 'link on' : 'link'} aria-current={on ? 'page' : undefined} onClick={() => openTab(t)}>
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
            Explore a Word
          </button>
        </nav>
      </header>

      {state.view === 'find' ? (
        <div className="main">
          <div className="left">
            {task === 'family' ? (
              <Picker
                key={`family-${kind}-${phase}`}
                ds={ds}
                stats={stats}
                notation={notation}
                mode="spelling"
                modes={[]}
                onMode={() => {}}
                onNotation={(n) => setState((s) => ({ ...s, notation: n }))}
                onPickGpc={pickGpc}
                onPickAffix={pickAffix}
                onHelp={() => setHelp(true)}
                shortList={familyGraphemes.short}
                graphemeFilter={familyGraphemes.filter}
                gpcFilter={familyGraphemes.want}
                heading1={phase === 'vowel' ? 'Vowel Spelling' : phase === 'ending' ? 'Ending Letters' : 'Beginning Letters'}
                heading2="Sound"
                searchPlaceholder="Search Letters"
                closedNote={phase === 'done' ? 'This beginning is complete. Click “start over” below to make another.' : undefined}
              />
            ) : (
              <Picker
                key={task}
                ds={ds}
                stats={stats}
                notation={notation}
                mode={task === 'parts' ? 'part' : findMode}
                modes={task === 'parts' ? [] : ['spelling', 'sound']}
                onMode={setFindMode}
                onNotation={(n) => setState((s) => ({ ...s, notation: n }))}
                onPickGpc={pickGpc}
                onPickAffix={pickAffix}
                onHelp={() => setHelp(true)}
                shortList={task === 'decodable' ? LETTERS : undefined}
              />
            )}

            <div className="selection-wrap">
              {task === 'family' ? (
                <FamilyBox
                  ds={ds}
                  notation={notation}
                  kind={kind}
                  phase={phase}
                  unit={familyUnit}
                  oneSyllable={query.filters.syllablesMax === 1}
                  onKind={(k) => {
                    if (k === kind) return;
                    startOverFamily();
                    setFamilyKind(k);
                  }}
                  onToVowel={() => setBodyWantsVowel(true)}
                  onUndo={undoFamily}
                  onStartOver={startOverFamily}
                  onOneSyllable={(on) =>
                    setQuery((q) => ({ ...q, filters: { ...q.filters, syllablesMin: null, syllablesMax: on ? 1 : defaultFilters().syllablesMax } }))
                  }
                />
              ) : (
                <Selection
                  ds={ds}
                  query={query}
                  notation={notation}
                  variant={task === 'decodable' ? 'decodable' : 'search'}
                  heading={task === 'decodable' ? 'Sound Spellings My Students Know' : task === 'parts' ? 'Word Parts Selected' : 'Sound Spellings Selected'}
                  activeRow={activeRow}
                  openRows={openRows}
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
              )}
              {task !== 'family' && history.length > 0 && (
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
      </footer>

      {help && <Help onClose={() => setHelp(false)} />}
      {print && <PrintSheet ds={ds} mode={print.mode} indexes={print.indexes} title={describeQuery(ds, query, notation)} />}
    </div>
  );
}

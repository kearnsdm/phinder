// "Word Explorer": one word, taken apart.
//   Sound spellings: a tile for each, shaded by how consistent the mapping is.
//   Body and rime:   for one-syllable words.
//   Word parts:      prefixes and suffixes found by rule.
// Every number comes from the Phinder word list. There is no data from readers here.

import { useMemo, useState } from 'react';
import { formatFrequency, gpcLabel, gpcsOf, graphemeLabel, phonemeLabel, type Dataset, type Gpc } from '../lib/dataset';
import type { Morph } from '../lib/morph';
import type { Notation } from '../lib/phonemeMeta';
import type { Criterion, Query } from '../lib/query';
import { allowedGpcs } from '../lib/search';
import { readingConsistency, spellingConsistency, type Stats, type Weight } from '../lib/stats';
import { bodyRime, unitLabel, unitSound, unitSpelling } from '../lib/units';

type Level = 'gpc' | 'bodyrime' | 'parts';
type Direction = 'reading' | 'spelling';

interface Props {
  ds: Dataset;
  stats: Stats;
  morph: Morph;
  query: Query;
  notation: Notation;
  word: string;
  onWord: (w: string) => void;
  onBack: () => void;
  /** Start a new search in the word list. `oneSyllable` also limits it to one-syllable words. */
  onFind: (criteria: Criterion[], oneSyllable?: boolean) => void;
}

// One hue, light to dark: darker means more consistent. Label ink is chosen per step for contrast.
const STEPS = [
  { min: 0.8, bg: '#167a4d', ink: '#ffffff', label: '80–100%' },
  { min: 0.6, bg: '#52b985', ink: '#0d2b1c', label: '60–79%' },
  { min: 0.4, bg: '#93d3b1', ink: '#0d2b1c', label: '40–59%' },
  { min: 0.2, bg: '#c3e6d2', ink: '#0d2b1c', label: '20–39%' },
  { min: 0, bg: '#e6f4ec', ink: '#0d2b1c', label: '0–19%' },
];
const stepFor = (v: number) => (Number.isNaN(v) ? { bg: '#f6f1f1', ink: '#0d2b1c' } : STEPS.find((s) => v >= s.min)!);
const pct = (v: number) =>
  Number.isNaN(v) ? '—' : v > 0 && v < 0.005 ? '<1%' : v < 1 && v >= 0.995 ? '>99%' : `${Math.round(v * 100)}%`;

interface RimeTable {
  /** spelling -> sound -> number of one-syllable words */
  rime: Map<string, Map<string, number>>;
  body: Map<string, Map<string, number>>;
}

function buildRimeTable(ds: Dataset): RimeTable {
  const rime = new Map<string, Map<string, number>>();
  const body = new Map<string, Map<string, number>>();
  const bump = (table: Map<string, Map<string, number>>, gpcs: Gpc[]) => {
    const spelling = unitSpelling(gpcs);
    const sound = unitSound(gpcs, 'ipa');
    let m = table.get(spelling);
    if (!m) table.set(spelling, (m = new Map()));
    m.set(sound, (m.get(sound) ?? 0) + 1);
  };
  for (let i = 0; i < ds.n; i++) {
    if (ds.syllables[i] !== 1) continue;
    const br = bodyRime(gpcsOf(ds, ds.seq[i]));
    if (!br) continue;
    bump(rime, br.rime);
    bump(body, br.body);
  }
  return { rime, body };
}

export function Explore({ ds, stats, morph, query, notation, word, onWord, onBack, onFind }: Props) {
  const [text, setText] = useState(word);
  const [level, setLevel] = useState<Level>('gpc');
  const [direction, setDirection] = useState<Direction>('reading');
  const [weight, setWeight] = useState<Weight>('words');
  const [lastWord, setLastWord] = useState(word);
  if (word !== lastWord) {
    // The word was changed from outside (a click in the word list, a share link).
    setLastWord(word);
    setText(word);
  }

  const typed = text.trim().toLowerCase();
  const index = ds.wordIndex.get(word);

  const suggestions = useMemo(() => {
    if (typed.length < 1 || typed === word) return [];
    const hits: number[] = [];
    for (let i = 0; i < ds.n && hits.length < 400; i++) if (ds.word[i].startsWith(typed)) hits.push(i);
    const f = (i: number) => (Number.isNaN(ds.freq[i]) ? -1 : ds.freq[i]);
    return hits.sort((a, b) => f(b) - f(a) || ds.word[a].length - ds.word[b].length).slice(0, 8);
  }, [typed, word, ds]);

  const rimeTable = useMemo(() => (level === 'bodyrime' ? buildRimeTable(ds) : null), [level, ds]);

  const choose = (w: string) => {
    setText(w);
    onWord(w);
  };

  const gpcs = index !== undefined ? gpcsOf(ds, ds.seq[index]) : [];
  const consistency = (g: Gpc, d: Direction) =>
    d === 'reading' ? readingConsistency(ds, stats, g.id, weight) : spellingConsistency(ds, stats, g.id, weight);
  const values = gpcs.map((g) => consistency(g, direction));
  const known = query.decodable && query.taught.length > 0 ? allowedGpcs(query) : null;
  const unknown = known ? gpcs.filter((g) => !known.has(g.id)) : [];
  const finite = values.filter((v) => !Number.isNaN(v));
  const mean = finite.length ? finite.reduce((a, b) => a + b, 0) / finite.length : NaN;
  const lowest = finite.length ? Math.min(...finite) : NaN;
  const lowestGpc = gpcs[values.indexOf(lowest)];

  const tags = (g: Gpc): string[] => {
    const t: string[] = [];
    if (g.phoneme.silent) t.push('silent');
    else if (g.phoneme.schwa) t.push('schwa');
    else if (g.phoneme.struct === 'V' || g.phoneme.struct === 'VC' || g.phoneme.struct === 'CV') t.push('vowel');
    if (g.splitVowel !== null) t.push('split');
    return t;
  };
  const commonest = (g: Gpc): Gpc => ds.gpcs[stats.byGrapheme.get(g.grapheme)!.gpcs[0]];
  const directionText = direction === 'reading' ? 'of the uses of this grapheme have this sound' : 'of the uses of this sound have this spelling';

  const toggle = <T extends string>(value: T, current: T, set: (v: T) => void, label: string) => (
    <button key={value} type="button" className={current === value ? 'toggle on' : 'toggle'} aria-pressed={current === value} onClick={() => set(value)}>
      {label}
    </button>
  );

  const br = level === 'bodyrime' && index !== undefined && ds.syllables[index] === 1 ? bodyRime(gpcs) : null;
  const shareOf = (table: Map<string, Map<string, number>>, unit: Gpc[]) => {
    const m = table.get(unitSpelling(unit));
    const total = m ? [...m.values()].reduce((a, b) => a + b, 0) : 0;
    const same = m?.get(unitSound(unit, 'ipa')) ?? 0;
    return { total, same, share: total ? same / total : NaN };
  };

  return (
    <section className="explore" aria-label="Word Explorer">
      <h2 className="heading">
        <button type="button" className="link back" onClick={onBack}>
          &#8249; Word List
        </button>
        Word Explorer
      </h2>

      <form
        className="explore-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (typed) choose(typed);
        }}
      >
        <input
          type="text"
          className="inputform word-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a word"
          aria-label="Word to explore"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        <button type="submit" className="apply">
          Explore
        </button>
        {suggestions.length > 0 && (
          <div className="suggest">
            {suggestions.map((i) => (
              <button key={i} type="button" className="link" onClick={() => choose(ds.word[i])}>
                {ds.word[i]}
              </button>
            ))}
          </div>
        )}
      </form>

      {word && index === undefined && <p className="explore-note">&ldquo;{word}&rdquo; is not in the Phinder word list.</p>}
      {!word && <p className="explore-note">Type a word, or click a word in the word list, to see its sound spellings.</p>}

      {index !== undefined && (
        <>
          <div className="explore-controls">
            <div className="control" role="group" aria-label="Level">
              <span className="mode-label">Show</span>
              {toggle<Level>('gpc', level, setLevel, 'Sound spellings')}
              {toggle<Level>('bodyrime', level, setLevel, 'Body and rime')}
              {toggle<Level>('parts', level, setLevel, 'Word parts')}
            </div>
            {level === 'gpc' && (
              <>
                <div className="control" role="group" aria-label="Direction of consistency">
                  <span className="mode-label">Consistency</span>
                  {toggle<Direction>('reading', direction, setDirection, 'Spelling → sound')}
                  {toggle<Direction>('spelling', direction, setDirection, 'Sound → spelling')}
                </div>
                <div className="control" role="group" aria-label="How to count">
                  <span className="mode-label">Count</span>
                  {toggle<Weight>('words', weight, setWeight, 'Each word once')}
                  {toggle<Weight>('freq', weight, setWeight, 'By frequency')}
                </div>
              </>
            )}
          </div>

          {level === 'gpc' && (
            <>
              <div className="tiles">
                {gpcs.map((g, k) => {
                  const step = stepFor(values[k]);
                  const isUnknown = known !== null && !known.has(g.id);
                  return (
                    <button
                      key={k}
                      type="button"
                      className={isUnknown ? 'tile unknown' : 'tile'}
                      style={{ background: step.bg, color: step.ink }}
                      title={`${gpcLabel(g, notation)}: ${pct(values[k])} ${directionText}. In ${stats.words[g.id].toLocaleString()} words. Click to find words with it.`}
                      onClick={() => onFind([{ type: 'unit', gpcs: [g.id], position: 'any' }])}
                    >
                      <span className="tile-g">{graphemeLabel(g.grapheme) === g.grapheme ? g.grapheme : '–'}</span>
                      <span className="tile-p">{phonemeLabel(g.phoneme, notation)}</span>
                      <span className="tile-v">{pct(values[k])}</span>
                      <span className="tile-tags">
                        {tags(g).map((t) => (
                          <span key={t} className="tag">
                            {t}
                          </span>
                        ))}
                        {isUnknown && <span className="tag">not known</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="legend" aria-label="Legend">
                <span>Consistency: low</span>
                {[...STEPS].reverse().map((s) => (
                  <span key={s.label} className="swatch" style={{ background: s.bg, color: s.ink }}>
                    {s.label}
                  </span>
                ))}
                <span>high</span>
              </div>
              <p className="explore-note">
                <em>Note.</em> The percentage on a tile is the share of the {direction === 'reading' ? 'grapheme’s uses that have this sound' : 'sound’s uses that have this spelling'}, in{' '}
                {stats.wordSet === 'freq' ? `the ${stats.nWords.toLocaleString()} Phinder words that have a frequency value` : `all ${stats.nWords.toLocaleString()} Phinder words`}
                {weight === 'freq' ? ', with each word counted by its frequency' : ''}. Click a tile to find words with that sound spelling.
              </p>

              <dl className="facts">
                <div>
                  <dt>Letters</dt>
                  <dd>{ds.letters[index]}</dd>
                </div>
                <div>
                  <dt>Syllables</dt>
                  <dd>{ds.syllables[index]}</dd>
                </div>
                <div>
                  <dt>Sound spellings</dt>
                  <dd>{gpcs.length}</dd>
                </div>
                <div>
                  <dt>Frequency</dt>
                  <dd title="Frequency per million words (Fitt, 2000)">{Number.isNaN(ds.freq[index]) ? 'no value' : `${formatFrequency(ds.freq[index])} per million`}</dd>
                </div>
                <div>
                  <dt>Mean consistency</dt>
                  <dd>{pct(mean)}</dd>
                </div>
                <div>
                  <dt>Lowest</dt>
                  <dd>{lowestGpc ? `${pct(lowest)} (${gpcLabel(lowestGpc, notation)})` : '—'}</dd>
                </div>
              </dl>

              <p className="explore-note decod">
                <b>Decodability. </b>
                {known === null
                  ? 'To check this word against the sound spellings your students know, fill the list under \u201CDecodable Words\u201D in the top line.'
                  : unknown.length === 0
                    ? `Every sound spelling in this word is on your list (${gpcs.length} of ${gpcs.length}).`
                    : `${gpcs.length - unknown.length} of ${gpcs.length} sound spellings are on your list. Not on your list: ${[...new Set(unknown.map((g) => gpcLabel(g, notation)))].join(', ')}.`}
              </p>

              <table className="detail">
                <thead>
                  <tr>
                    <th>Grapheme</th>
                    <th>Sound</th>
                    <th title="Of the uses of this grapheme, the share with this sound">Spelling &rarr; sound</th>
                    <th title="Of the uses of this sound, the share with this spelling">Sound &rarr; spelling</th>
                    <th>Words</th>
                    <th>Most common sound of the grapheme</th>
                  </tr>
                </thead>
                <tbody>
                  {gpcs.map((g, k) => (
                    <tr key={k}>
                      <td className="spelling">{graphemeLabel(g.grapheme)}</td>
                      <td className="spelling">{phonemeLabel(g.phoneme, notation)}</td>
                      <td>{pct(consistency(g, 'reading'))}</td>
                      <td>{pct(consistency(g, 'spelling'))}</td>
                      <td>{stats.words[g.id].toLocaleString()}</td>
                      <td className="spelling">
                        {commonest(g).id === g.id ? 'this one' : `${phonemeLabel(commonest(g).phoneme, notation)} (${pct(consistency(commonest(g), 'reading'))})`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {level === 'bodyrime' &&
            (br && rimeTable ? (
              <>
                <div className="tiles">
                  {(
                    [
                      ['Body', br.body, rimeTable.body, 'start', 'begin'],
                      ['Rime', br.rime, rimeTable.rime, 'end', 'end'],
                    ] as const
                  ).map(([name, unit, table, position, verb]) => {
                    const s = shareOf(table, [...unit]);
                    const step = stepFor(s.share);
                    return (
                      <button
                        key={name}
                        type="button"
                        className="tile wide"
                        style={{ background: step.bg, color: step.ink }}
                        title={`Click to find one-syllable words that ${verb} with ${unitLabel([...unit], notation)}`}
                        onClick={() => onFind([{ type: 'unit', gpcs: unit.map((g) => g.id), position }], true)}
                      >
                        <span className="tile-k">{name}</span>
                        <span className="tile-g">{unitSpelling([...unit])}</span>
                        <span className="tile-p">{unitSound([...unit], notation)}</span>
                        <span className="tile-v">{pct(s.share)}</span>
                        <span className="tile-tags">
                          {s.same.toLocaleString()} of {s.total.toLocaleString()} words
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="explore-note">
                  <em>Note.</em> Body = the letters through the vowel; rime = the vowel and what follows. The percentage is the share of one-syllable Phinder words with that spelling at the{' '}
                  start (body) or end (rime) that also have this sound. Click a tile to list those words.
                </p>
              </>
            ) : (
              <p className="explore-note">Body and rime are shown for one-syllable words. This word has {ds.syllables[index]} syllables.</p>
            ))}

          {level === 'parts' && <Parts ds={ds} morph={morph} index={index} onFind={onFind} />}
        </>
      )}
    </section>
  );
}

function Parts({ ds, morph, index, onFind }: { ds: Dataset; morph: Morph; index: number; onFind: Props['onFind'] }) {
  const parts = useMemo(() => morph.parse(index), [morph, index]);
  return (
    <>
      {parts.length === 0 ? (
        <p className="explore-note">The rules found no prefix or suffix on this word.</p>
      ) : (
        <table className="detail parts-table">
          <thead>
            <tr>
              <th>Word part</th>
              <th>Meaning</th>
              <th>Base word</th>
              <th>Base keeps its sound</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {parts.map(({ def, hit }) => (
              <tr key={def.id}>
                <td className="spelling">{def.kind === 'prefix' ? `${hit.form}-` : `-${hit.form}`}</td>
                <td>{def.meaning}</td>
                <td className="spelling">{ds.word[hit.base]}</td>
                <td>{hit.keepsSound ? 'yes' : 'no'}</td>
                <td>
                  <button type="button" className="link small" onClick={() => onFind([{ type: 'affix', affix: def.id, keepsSound: true }])}>
                    Find words
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="explore-note">
        <em>Note.</em> Word parts are found by rule: the letters match, and what is left is a word in the list. The rules cannot check meaning, so some results are wrong (for example,
        corner = corn + er).
      </p>
    </>
  );
}


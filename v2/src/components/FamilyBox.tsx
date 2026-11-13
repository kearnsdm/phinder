// Step 3 of the "Word family" tab: the family being built.
//   Ending (rime):    a vowel spelling, then the letters after it. ake -> make, take, lake
//   Beginning (body): the letters before the vowel, then the vowel. ca  -> cat, can, cap

import type { Dataset } from '../lib/dataset';
import type { Notation } from '../lib/phonemeMeta';
import type { UnitCriterion } from '../lib/query';
import { unitLabel } from '../lib/units';

export type FamilyKind = 'rime' | 'body';
/** What the grids are asking for now. */
export type FamilyPhase = 'vowel' | 'ending' | 'beginning' | 'done';

interface Props {
  ds: Dataset;
  notation: Notation;
  kind: FamilyKind;
  phase: FamilyPhase;
  unit: UnitCriterion | null;
  oneSyllable: boolean;
  onKind: (k: FamilyKind) => void;
  /** Body families only: move from the beginning letters to the vowel. */
  onToVowel: () => void;
  onUndo: () => void;
  onStartOver: () => void;
  onOneSyllable: (on: boolean) => void;
}

const HINT: Record<FamilyKind, Record<FamilyPhase, string>> = {
  rime: {
    vowel: 'Choose a vowel spelling above, then its sound.',
    ending: 'Now choose the letters that come after the vowel, one at a time.',
    beginning: '',
    done: '',
  },
  body: {
    beginning: 'Choose the letters that come before the vowel, one at a time.',
    vowel: 'Now choose the vowel spelling, then its sound.',
    ending: '',
    done: 'This beginning is complete. Start over to make another.',
  },
};

export function FamilyBox({ ds, notation, kind, phase, unit, oneSyllable, onKind, onToVowel, onUndo, onStartOver, onOneSyllable }: Props) {
  const gpcs = unit ? unit.gpcs.map((id) => ds.gpcs[id]) : [];
  return (
    <div className="selection family">
      <h2 className="heading">
        <span className="num">3</span>Word Family
      </h2>

      <div className="control" role="group" aria-label="Kind of word family">
        <span className="mode-label">Words that</span>
        <button type="button" className={kind === 'rime' ? 'toggle on' : 'toggle'} aria-pressed={kind === 'rime'} onClick={() => onKind('rime')}>
          end the same
        </button>
        <button type="button" className={kind === 'body' ? 'toggle on' : 'toggle'} aria-pressed={kind === 'body'} onClick={() => onKind('body')}>
          begin the same
        </button>
      </div>

      <div className="family-row">
        {unit ? (
          <div className="chip family-chip">
            <span className="chip-label">
              <span className="spelling">{unitLabel(gpcs, notation)}</span>
              <span className="chip-tags">{kind === 'rime' ? 'end of the word' : 'start of the word'}</span>
            </span>
          </div>
        ) : (
          <span className="row-empty">{HINT[kind][phase]}</span>
        )}
        {unit && (
          <span className="family-actions">
            <button type="button" className="link small" onClick={onUndo}>
              undo last
            </button>
            <button type="button" className="link small" onClick={onStartOver}>
              start over
            </button>
          </span>
        )}
      </div>
      {unit && <p className="family-hint">{HINT[kind][phase]}</p>}
      {kind === 'body' && phase === 'beginning' && unit && (
        <button type="button" className="link small family-next" onClick={onToVowel}>
          Next: choose the vowel &rsaquo;
        </button>
      )}

      <label className="check family-check">
        <input type="checkbox" checked={oneSyllable} onChange={(e) => onOneSyllable(e.target.checked)} />
        One-syllable words only
      </label>
    </div>
  );
}

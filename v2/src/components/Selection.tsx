// Step 3: the sound spellings selected, in rows.
//   Row 1 (always):  every item must be in the word (AND). "+" joins two
//                    neighbours into one unit, such as the rime "ake".
//   OR row:          at least one item must be in the word.     (Advanced)
//   NOT row:         none of the items may be in the word.      (Advanced)
//   KNOWN row:       the sound spellings students know.         (Decodable words only)
// Clicking a row makes it the row that the grids add to.

import { Fragment, useEffect, useRef, useState } from 'react';
import { gpcLabel, type Dataset } from '../lib/dataset';
import { criterionLabel, criterionTags, type Row } from '../lib/edit';
import type { Notation } from '../lib/phonemeMeta';
import type { Criterion, GroupName, Position, Query } from '../lib/query';

interface Props {
  ds: Dataset;
  query: Query;
  notation: Notation;
  activeRow: Row;
  advanced: boolean;
  onActivate: (row: Row) => void;
  onRemove: (row: Row, index: number) => void;
  onJoin: (row: GroupName, index: number) => void;
  onSplit: (row: GroupName, index: number) => void;
  onPosition: (row: GroupName, index: number, position: Position) => void;
  onKeepsSound: (row: GroupName, index: number, keepsSound: boolean) => void;
  onClearTaught: () => void;
}

const ROW_LABEL: Record<Row, string> = { all: '', any: 'OR', none: 'NOT', taught: 'KNOWN' };
const ROW_HINT: Record<Row, string> = {
  all: 'Words must have every sound spelling in this row.',
  any: 'Words must have at least one sound spelling in this row.',
  none: 'Words must not have any sound spelling in this row.',
  taught: 'The sound spellings your students know. Words may use only these and the ones in the rows above.',
};

const POSITIONS: [Position, string][] = [
  ['any', 'Anywhere in the word'],
  ['start', 'Start of the word'],
  ['middle', 'Middle of the word'],
  ['end', 'End of the word'],
];

export function Selection(props: Props) {
  const { ds, query, notation, activeRow, advanced } = props;
  const [menu, setMenu] = useState<{ row: GroupName; index: number } | null>(null);
  const root = useRef<HTMLDivElement>(null);

  // Close the chip menu on a click elsewhere or on Escape.
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.chip-wrap.open')) setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(null);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const rows: Row[] = ['all', ...(advanced ? (['any', 'none'] as Row[]) : []), ...(query.decodable ? (['taught'] as Row[]) : [])];
  const multipleRows = rows.length > 1;

  const chip = (row: GroupName, c: Criterion, index: number) => {
    const open = menu?.row === row && menu.index === index;
    const tags = criterionTags(ds, c);
    return (
      <div className={open ? 'chip-wrap open' : 'chip-wrap'}>
        <div className="chip">
          <button
            type="button"
            className="chip-label"
            aria-haspopup="menu"
            aria-expanded={open}
            title="Choices for this item"
            onClick={(e) => {
              e.stopPropagation();
              props.onActivate(row);
              setMenu(open ? null : { row, index });
            }}
          >
            <span className="spelling">{criterionLabel(ds, c, notation)}</span>
            {tags.length > 0 && <span className="chip-tags">{tags.join(' · ')}</span>}
          </button>
          <button
            type="button"
            className="chip-x"
            aria-label={`Remove ${criterionLabel(ds, c, notation)}`}
            title="Remove"
            onClick={(e) => {
              e.stopPropagation();
              setMenu(null);
              props.onRemove(row, index);
            }}
          >
            &#10006;
          </button>
        </div>
        {open && (
          <div className="chip-menu" role="menu">
            {c.type === 'unit' ? (
              <>
                <div className="menu-title">Where in the word?</div>
                {POSITIONS.map(([p, text]) => (
                  <button
                    key={p}
                    type="button"
                    role="menuitemradio"
                    aria-checked={c.position === p}
                    className={c.position === p ? 'menu-item on' : 'menu-item'}
                    onClick={() => {
                      props.onPosition(row, index, p);
                      setMenu(null);
                    }}
                  >
                    {text}
                  </button>
                ))}
                {c.gpcs.length > 1 && (
                  <button
                    type="button"
                    role="menuitem"
                    className="menu-item split"
                    onClick={() => {
                      props.onSplit(row, index);
                      setMenu(null);
                    }}
                  >
                    Split back into {c.gpcs.length} sound spellings
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="menu-title">Which words?</div>
                {(
                  [
                    [true, 'Base word keeps its sound (make → making)'],
                    [false, 'Also when the base changes sound (sign → signal)'],
                  ] as [boolean, string][]
                ).map(([value, text]) => (
                  <button
                    key={String(value)}
                    type="button"
                    role="menuitemradio"
                    aria-checked={c.keepsSound === value}
                    className={c.keepsSound === value ? 'menu-item on' : 'menu-item'}
                    onClick={() => {
                      props.onKeepsSound(row, index, value);
                      setMenu(null);
                    }}
                  >
                    {text}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="selection" ref={root}>
      <h2 className="heading">
        <span className="num">3</span>Sound Spellings Selected
      </h2>
      {rows.map((row) => {
        const active = activeRow === row;
        const dim = multipleRows && !active;
        const items = row === 'taught' ? [] : query[row];
        return (
          <div
            key={row}
            className={`sel-row${dim ? ' dim' : ''}${multipleRows && active ? ' active' : ''}`}
            title={ROW_HINT[row]}
            onClick={() => props.onActivate(row)}
          >
            {row !== 'all' && <div className="row-label">{ROW_LABEL[row]}</div>}
            <div className="row-items">
              {row === 'taught' ? (
                <>
                  {query.taught.map((id, index) => (
                    <div key={id} className="chip small">
                      <span className="spelling">{gpcLabel(ds.gpcs[id], notation)}</span>
                      <button
                        type="button"
                        className="chip-x"
                        aria-label={`Remove ${gpcLabel(ds.gpcs[id], notation)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          props.onRemove('taught', index);
                        }}
                      >
                        &#10006;
                      </button>
                    </div>
                  ))}
                  {query.taught.length === 0 && (
                    <span className="row-empty">{active ? 'Choose the sound spellings your students know.' : 'Click here, then choose the sound spellings your students know.'}</span>
                  )}
                  {query.taught.length > 1 && (
                    <button
                      type="button"
                      className="link small"
                      onClick={(e) => {
                        e.stopPropagation();
                        props.onClearTaught();
                      }}
                    >
                      clear all
                    </button>
                  )}
                </>
              ) : (
                <>
                  {items.map((c, index) => (
                    <Fragment key={index}>
                      {chip(row, c, index)}
                      {index + 1 < items.length && (
                        <div className="joiner">
                          <div className="and">{row === 'all' ? 'AND' : 'OR'}</div>
                          {c.type === 'unit' && items[index + 1].type === 'unit' ? (
                            <button
                              type="button"
                              className="plus"
                              title="Join into one unit: the two must be next to each other in the word, in this order (for example a-e + k = ake)"
                              aria-label="Join with the next sound spelling"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenu(null);
                                props.onJoin(row, index);
                              }}
                            >
                              +
                            </button>
                          ) : (
                            <div className="plus none" aria-hidden />
                          )}
                        </div>
                      )}
                    </Fragment>
                  ))}
                  {items.length === 0 && multipleRows && (
                    <span className="row-empty">{active ? 'Choose a sound spelling above.' : 'Click here to add to this row.'}</span>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

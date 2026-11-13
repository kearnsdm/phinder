// Step 3: what has been selected, in rows.
//
// "search" (pages Find Words, Sound to Spelling, Advanced):
//   main row:  every item must be in the word (AND).
//   On the Advanced page only: "+" joins two neighbours into one unit, such
//   as "ake"; a click on an item sets its place in the word; and two more
//   rows can be added:
//   OR row:    at least one item must be in the word.
//   NOT row:   none of the items may be in the word.
// "decodable" (page Decodable List):
//   main row:  the sound spellings students know.
//   MUST HAVE: sound spellings every word must contain. (added with a button)
//
// Clicking a row makes it the row that the grids add to.

import { Fragment, useEffect, useState } from 'react';
import { gpcLabel, type Dataset } from '../lib/dataset';
import { criterionLabel, criterionTags, type Row } from '../lib/edit';
import type { Notation } from '../lib/phonemeMeta';
import type { Criterion, GroupName, Position, Query } from '../lib/query';

export type SelectionVariant = 'search' | 'decodable';

interface Props {
  ds: Dataset;
  query: Query;
  notation: Notation;
  variant: SelectionVariant;
  heading: string;
  activeRow: Row;
  /** Optional rows that are showing. A row that holds something always shows. */
  openRows: Row[];
  /** Optional rows this page lets a person add ("+ or one of these"). */
  addableRows: Row[];
  /** true on the Advanced page: the join "+" and the menu on each selected item (place in the word). */
  advanced: boolean;
  onActivate: (row: Row) => void;
  onOpenRow: (row: Row) => void;
  /** Empties an optional row and hides it. */
  onCloseRow: (row: Row) => void;
  onRemove: (row: Row, index: number) => void;
  onJoin: (row: GroupName, index: number) => void;
  onSplit: (row: GroupName, index: number) => void;
  onPosition: (row: GroupName, index: number, position: Position) => void;
  onKeepsSound: (row: GroupName, index: number, keepsSound: boolean) => void;
  onClearTaught: () => void;
}

interface RowText {
  label: string;
  hint: string;
  add: string;
  empty: string;
}

const TEXT: Record<SelectionVariant, Partial<Record<Row, RowText>>> = {
  search: {
    all: { label: '', hint: 'Words must have every item in this row.', add: '', empty: 'Choose a sound spelling above.' },
    any: { label: 'OR', hint: 'Words must have at least one item in this row.', add: '+ or one of these', empty: 'Choose one or more above.' },
    none: { label: 'NOT', hint: 'Words must not have any item in this row.', add: '+ but none of these', empty: 'Choose one or more above.' },
  },
  decodable: {
    taught: {
      label: '',
      hint: 'The sound spellings your students know. The list shows only words made from these.',
      add: '',
      empty: 'Choose the sound spellings your students know. Click a letter, then its sound.',
    },
    all: { label: 'MUST HAVE', hint: 'Every word in the list must also contain these.', add: '+ words must also have', empty: 'Choose one or more above.' },
  },
};

const ORDER: Record<SelectionVariant, Row[]> = { search: ['all', 'any', 'none'], decodable: ['taught', 'all'] };

const POSITIONS: [Position, string][] = [
  ['any', 'Anywhere in the word'],
  ['start', 'Start of the word'],
  ['middle', 'Middle of the word'],
  ['end', 'End of the word'],
];

export function Selection(props: Props) {
  const { ds, query, notation, variant, activeRow } = props;
  const [menu, setMenu] = useState<{ row: GroupName; index: number } | null>(null);

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

  const main = ORDER[variant][0];
  const count = (row: Row) => (row === 'taught' ? query.taught.length : query[row].length);
  const rows = ORDER[variant].filter((row) => row === main || props.openRows.includes(row) || count(row) > 0);
  const addable = ORDER[variant].filter((row) => !rows.includes(row) && props.addableRows.includes(row));
  const multipleRows = rows.length > 1;

  const chip = (row: GroupName, c: Criterion, index: number) => {
    const open = menu?.row === row && menu.index === index;
    const tags = criterionTags(ds, c);
    return (
      <div className={open ? 'chip-wrap open' : 'chip-wrap'}>
        <div className="chip">
          {props.advanced ? (
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
          ) : (
            <span className="chip-label plain">
              <span className="spelling">{criterionLabel(ds, c, notation)}</span>
              {tags.length > 0 && <span className="chip-tags">{tags.join(' · ')}</span>}
            </span>
          )}
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
    <div className="selection">
      <h2 className="heading">
        <span className="num">3</span>
        {props.heading}
      </h2>
      {rows.map((row) => {
        const text = TEXT[variant][row]!;
        const active = activeRow === row;
        const dim = multipleRows && !active;
        return (
          <div key={row} className={`sel-row${dim ? ' dim' : ''}${multipleRows && active ? ' active' : ''}`} title={text.hint} onClick={() => props.onActivate(row)}>
            {text.label && (
              <div className="row-label">
                {text.label}
                {row !== main && (
                  <button
                    type="button"
                    className="row-close"
                    aria-label={`Remove the ${text.label} row`}
                    title="Remove this row"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenu(null);
                      props.onCloseRow(row);
                    }}
                  >
                    &#10006;
                  </button>
                )}
              </div>
            )}
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
                  {query.taught.length === 0 && <span className="row-empty">{text.empty}</span>}
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
                  {query[row].map((c, index, items) => (
                    <Fragment key={index}>
                      {chip(row, c, index)}
                      {index + 1 < items.length && (
                        <div className="joiner">
                          <div className="and">{row === 'any' ? 'OR' : row === 'none' ? 'OR' : 'AND'}</div>
                          {props.advanced && c.type === 'unit' && items[index + 1].type === 'unit' ? (
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
                  {query[row].length === 0 && (multipleRows || row !== 'all') && (
                    <span className="row-empty">{active ? text.empty : 'Click here to add to this row.'}</span>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
      {addable.length > 0 && count(main) > 0 && (
        <div className="row-adds">
          {addable.map((row) => (
            <button key={row} type="button" className="link small" title={TEXT[variant][row]!.hint} onClick={() => props.onOpenRow(row)}>
              {TEXT[variant][row]!.add}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

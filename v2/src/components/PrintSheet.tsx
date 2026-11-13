// What goes on paper for "Print list" and "Print cards". Hidden on screen.

import type { Dataset } from '../lib/dataset';
import { CREDIT } from '../lib/export';

export type PrintMode = 'list' | 'cards';

export function PrintSheet({ ds, mode, indexes, title }: { ds: Dataset; mode: PrintMode; indexes: number[]; title: string }) {
  return (
    <div className={`print-sheet ${mode}`}>
      {mode === 'list' && (
        <>
          <h1>Phinder word list</h1>
          <p className="print-title">{title}</p>
          <p className="print-count">{indexes.length.toLocaleString()} words</p>
        </>
      )}
      <p className="print-credit">{CREDIT}</p>
      <div className="print-words">
        {indexes.map((i) => (
          <div key={i} className="print-word">
            {ds.word[i]}
          </div>
        ))}
      </div>
    </div>
  );
}

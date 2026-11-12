// The help window (the "?" beside "1 Graphemes").

import { useEffect } from 'react';

export function Help({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="How to use Phinder">
        <button type="button" className="modal-x" aria-label="Close" onClick={onClose}>
          &#10006;
        </button>
        <h2>How to use Phinder</h2>
        <ol>
          <li>
            <b>Graphemes.</b> Click a letter pattern. Type in &ldquo;Search Letter Pattern&rdquo; to find others, or click &ldquo;&hellip;&rdquo; to see all of them.
          </li>
          <li>
            <b>Phonemes.</b> Click the sound you want for that pattern. The most common sound comes first. Use &ldquo;Sound Code&rdquo; or &ldquo;IPA&rdquo; to change how sounds are written.
          </li>
          <li>
            <b>Sound Spellings Selected.</b> Each choice appears here. Words must have all of them. Click &#10006; to remove one.
          </li>
          <li>
            <b>Word List.</b> The list updates as you choose. Click a word to explore it.
          </li>
        </ol>
        <h3>More ways to search</h3>
        <ul>
          <li>
            <b>Start with a sound.</b> Above the grids, choose &ldquo;Sound&rdquo; to pick a sound first and then one of its spellings. Choose &ldquo;Word part&rdquo; for prefixes and suffixes.
          </li>
          <li>
            <b>Join sound spellings.</b> Click &ldquo;+&rdquo; under AND to join two neighbours into one unit that must appear together, such as a-e + k = ake.
          </li>
          <li>
            <b>Start, middle or end of the word.</b> Click a selected sound spelling to say where it must be. A rime such as &ldquo;ake&rdquo; at the end of the word gives a word family.
          </li>
          <li>
            <b>Advanced.</b> Adds an OR row (at least one of these) and a NOT row (none of these). Click a row to add to it.
          </li>
          <li>
            <b>Decodable words only.</b> Adds a KNOWN row. Put the sound spellings your students know there. The list then shows only words in which every sound spelling is known.
            For example, with a, i, m, n, p, s and t in the KNOWN row, the list has &ldquo;map,&rdquo; &ldquo;pin&rdquo; and &ldquo;spit,&rdquo; and not &ldquo;ship.&rdquo;
          </li>
          <li>
            <b>Options.</b> Limit syllables, letters and frequency, or use only words that have a frequency value.
          </li>
          <li>
            <b>Save or share.</b> &ldquo;Copy link&rdquo; copies an address that reopens this exact search. Under the list you can copy the words, get a spreadsheet file, or print a list or
            word cards.
          </li>
        </ul>
      </div>
    </div>
  );
}

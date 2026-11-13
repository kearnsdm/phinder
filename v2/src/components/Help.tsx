// The help window (the "?" beside step 1).

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
        <p>The top line names the pages. Each page keeps its own list while you look at the others.</p>

        <h3>Find Words</h3>
        <ol>
          <li>
            <b>Graphemes.</b> Click a letter pattern. Type in &ldquo;Search Letter Pattern&rdquo; to find others, or click &ldquo;&hellip;&rdquo; to see all of them.
          </li>
          <li>
            <b>Phonemes.</b> Click the sound you want for that pattern. The most common sound comes first.
          </li>
          <li>
            <b>Sound Spellings Selected.</b> Each choice appears here. Words must have all of them. Click &#10006; to remove one.
          </li>
          <li>
            <b>Word List.</b> The list updates as you choose. Click a word to explore it.
          </li>
        </ol>
        <p>
          <b>Word part.</b> The &ldquo;Prefix&rdquo; and &ldquo;Suffix&rdquo; menus under the grids add a word part to your selection. Word parts are found by rule, so check the list
          before you use it.
        </p>

        <h3>Sound to Spelling</h3>
        <p>The same steps the other way round: click a sound, then one of its spellings.</p>

        <h3>Decodable List</h3>
        <p>
          Choose the sound spellings your students know: click a letter, then its sound. The list shows only words in which every sound spelling is known. For example, with a, i, m,
          n, p, s and t the list has &ldquo;map,&rdquo; &ldquo;pin&rdquo; and &ldquo;spit,&rdquo; and not &ldquo;ship.&rdquo;
        </p>

        <h3>Advanced</h3>
        <ul>
          <li>
            <b>Or, and not.</b> Under your selection, &ldquo;+ or one of these&rdquo; adds a row of alternatives, and &ldquo;+ but none of these&rdquo; adds a row of sound spellings to
            leave out. Click a row to add to it.
          </li>
          <li>
            <b>Join.</b> Click &ldquo;+&rdquo; under AND to join two neighbours into one unit that must appear together. For example, a-e + k = ake lists &ldquo;make,&rdquo;
            &ldquo;take&rdquo; and &ldquo;lake.&rdquo;
          </li>
          <li>
            <b>Place in the word.</b> Click a selected sound spelling to say where it must be: start, middle or end.
          </li>
          <li>
            <b>Word shape.</b> Choose a shape such as CVC. C is one consonant sound spelling (b, sh, ck). V is one vowel sound spelling (a, ai, ar). The e in CVCe is the e of a split
            digraph, as in &ldquo;make.&rdquo;
          </li>
          <li>
            <b>Start with a sound.</b> The round button with two arrows between steps 1 and 2 makes the two grids trade places.
          </li>
        </ul>

        <h3>For every list</h3>
        <ul>
          <li>
            <b>Options.</b> Limit syllables, letters and frequency, or use only words that have a frequency value.
          </li>
          <li>
            <b>Frequency.</b> The number beside a word is its frequency per million words (Fitt, 2000).
          </li>
          <li>
            <b>Sound Code or IPA.</b> Changes how sounds are written.
          </li>
          <li>
            <b>Save or share.</b> &ldquo;Copy link&rdquo; copies an address that reopens this exact list. Under the list you can copy the words, get a spreadsheet file, or print a list
            or word cards.
          </li>
        </ul>
      </div>
    </div>
  );
}

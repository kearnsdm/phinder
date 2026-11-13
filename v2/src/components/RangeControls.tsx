// The two kinds of range control in Options.
//   RangeButtons: a row of numbered buttons for a small whole-number range
//                 (syllables, letters). Click the smallest, then the largest.
//   RangeSlider:  a slider with two handles for frequency. Its stops follow a
//                 1-2-5 series, so low frequencies get most of the track.

import { useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// RangeButtons
// ---------------------------------------------------------------------------

interface RangeButtonsProps {
  /** The numbers on the buttons, in order. The last one stands for "this many or more". */
  values: number[];
  min: number | null;
  max: number | null;
  /** "syllable", "letter" */
  unit: string;
  onChange: (min: number | null, max: number | null) => void;
}

export function RangeButtons({ values, min, max, unit, onChange }: RangeButtonsProps) {
  // After a first click the control waits for the other end of the range.
  const [anchor, setAnchor] = useState<number | null>(null);
  const first = values[0];
  const last = values[values.length - 1];
  const any = min === null && max === null;
  const lo = min ?? first;
  const hi = max ?? last;
  const inRange = (v: number) => !any && v >= lo && v <= hi;

  /** Stores a range; the first button means "no minimum" and the last means "no maximum". */
  const store = (a: number, b: number) => onChange(a <= first ? null : a, b >= last ? null : b);

  const click = (v: number) => {
    if (anchor === null) {
      // First click: exactly this number (for the last button: this many or more).
      onChange(v, v === last ? null : v);
      setAnchor(v);
    } else if (v === anchor) {
      setAnchor(null); // a second click on the same number keeps "exactly this number"
    } else {
      store(Math.min(anchor, v), Math.max(anchor, v));
      setAnchor(null);
    }
  };

  const plural = (n: number) => (n === 1 ? unit : `${unit}s`);
  const summary = any
    ? `Any number of ${unit}s`
    : min !== null && max !== null
      ? min === max
        ? `${min} ${plural(min)}`
        : `${min} to ${max} ${unit}s`
      : max !== null
        ? `Up to ${max} ${plural(max)}`
        : `${min} or more ${unit}s`;

  return (
    <span className="range-buttons">
      <span className="btn-row" role="group" aria-label={`${unit}s`}>
        {values.map((v) => (
          <button
            key={v}
            type="button"
            className={`${inRange(v) ? 'on' : ''}${anchor === v ? ' anchor' : ''}`}
            aria-pressed={inRange(v)}
            onClick={() => click(v)}
          >
            {v === last ? `${v}+` : v}
          </button>
        ))}
        <button
          type="button"
          className={any ? 'on' : ''}
          aria-pressed={any}
          onClick={() => {
            onChange(null, null);
            setAnchor(null);
          }}
        >
          Any
        </button>
      </span>
      <span className="range-summary">
        {summary}
        {anchor !== null && <span className="range-hint"> &middot; click another number to make a range</span>}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// RangeSlider
// ---------------------------------------------------------------------------

/** Frequency stops, per million words. The two ends mean "no limit". */
export const FREQUENCY_STOPS = [0, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, Infinity];

/** Where a value sits on the track, as a (possibly fractional) stop index. */
function indexOfValue(stops: number[], value: number): number {
  if (value <= stops[0]) return 0;
  for (let k = 0; k < stops.length - 1; k++) {
    if (value < stops[k + 1]) {
      const width = Number.isFinite(stops[k + 1]) ? stops[k + 1] - stops[k] : 1;
      return k + Math.min(1, (value - stops[k]) / width);
    }
  }
  return stops.length - 1;
}

interface RangeSliderProps {
  stops: number[];
  /** The stops that get a label under the track. */
  labels: number[];
  min: number | null;
  max: number | null;
  onChange: (min: number | null, max: number | null) => void;
  format: (value: number) => string;
  ariaLabel: string;
}

export function RangeSlider({ stops, labels, min, max, onChange, format, ariaLabel }: RangeSliderProps) {
  const track = useRef<HTMLDivElement>(null);
  const end = stops.length - 1;
  const loIndex = min === null ? 0 : indexOfValue(stops, min);
  const hiIndex = max === null ? end : indexOfValue(stops, max);
  const percent = (index: number) => `${(100 * index) / end}%`;

  /** Stores a pair of stop indexes; the two ends of the track mean "no limit". */
  const store = (lo: number, hi: number) => onChange(lo <= 0 ? null : stops[lo], hi >= end ? null : stops[hi]);

  const indexAt = (clientX: number) => {
    const box = track.current!.getBoundingClientRect();
    return Math.max(0, Math.min(end, Math.round(((clientX - box.left) / box.width) * end)));
  };

  const move = (which: 'lo' | 'hi', index: number) => {
    if (which === 'lo') store(Math.min(index, Math.floor(hiIndex)), Math.round(hiIndex));
    else store(Math.round(loIndex), Math.max(index, Math.ceil(loIndex)));
  };

  const drag = (which: 'lo' | 'hi') => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const thumb = e.currentTarget;
    thumb.setPointerCapture(e.pointerId);
    thumb.focus();
    const onMove = (ev: PointerEvent) => move(which, indexAt(ev.clientX));
    const stop = () => {
      thumb.removeEventListener('pointermove', onMove);
      thumb.removeEventListener('pointerup', stop);
      thumb.removeEventListener('pointercancel', stop);
    };
    thumb.addEventListener('pointermove', onMove);
    thumb.addEventListener('pointerup', stop);
    thumb.addEventListener('pointercancel', stop);
  };

  const keys = (which: 'lo' | 'hi') => (e: React.KeyboardEvent) => {
    const at = Math.round(which === 'lo' ? loIndex : hiIndex);
    const step = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : 0;
    if (step) move(which, Math.max(0, Math.min(end, at + step)));
    else if (e.key === 'Home') move(which, 0);
    else if (e.key === 'End') move(which, end);
    else return;
    e.preventDefault();
  };

  /** A click on the track or on a label moves the nearer handle there. */
  const jump = (index: number) => move(Math.abs(index - loIndex) <= Math.abs(index - hiIndex) ? 'lo' : 'hi', index);

  const text = (index: number) => (index <= 0 ? 'no minimum' : index >= end ? 'no maximum' : format(stops[Math.round(index)]));

  return (
    <div className="slider" role="group" aria-label={ariaLabel}>
      <div className="slider-track" ref={track} onPointerDown={(e) => e.target === e.currentTarget && jump(indexAt(e.clientX))}>
        <div className="slider-fill" style={{ left: percent(loIndex), right: `${100 - (100 * hiIndex) / end}%` }} />
        <button
          type="button"
          className="slider-thumb"
          role="slider"
          aria-label="Lowest frequency"
          aria-valuemin={0}
          aria-valuemax={end}
          aria-valuenow={Math.round(loIndex)}
          aria-valuetext={text(loIndex)}
          style={{ left: percent(loIndex) }}
          onPointerDown={drag('lo')}
          onKeyDown={keys('lo')}
        />
        <button
          type="button"
          className="slider-thumb"
          role="slider"
          aria-label="Highest frequency"
          aria-valuemin={0}
          aria-valuemax={end}
          aria-valuenow={Math.round(hiIndex)}
          aria-valuetext={text(hiIndex)}
          style={{ left: percent(hiIndex) }}
          onPointerDown={drag('hi')}
          onKeyDown={keys('hi')}
        />
      </div>
      <div className="slider-labels">
        {labels.map((value) => {
          const index = stops.indexOf(value);
          return (
            <button key={String(value)} type="button" className="slider-label" style={{ left: percent(index) }} tabIndex={-1} onClick={() => jump(index)}>
              {Number.isFinite(value) ? format(value) : 'max'}
            </button>
          );
        })}
      </div>
    </div>
  );
}

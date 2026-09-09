"use client";

import { useCallback, useRef } from "react";
import type { MelodicStep } from "@/lib/groove/types";
import { STEPS } from "@/lib/groove/types";
import { CHORD_SHAPES, clampNote, noteName } from "@/lib/groove/music";

interface NoteGridProps {
  unit: string;
  steps: MelodicStep[];
  current: number;
  showChord: boolean;
  onChange: (index: number, step: MelodicStep) => void;
  onAudition: (step: MelodicStep) => void;
}

export function NoteGrid({
  unit,
  steps,
  current,
  showChord,
  onChange,
  onAudition,
}: NoteGridProps) {
  const drag = useRef<{
    index: number;
    y: number;
    note: number;
    moved: boolean;
  } | null>(null);

  const down = useCallback(
    (e: React.PointerEvent, i: number) => {
      e.preventDefault();
      (e.target as Element).setPointerCapture(e.pointerId);
      const step = steps[i];
      if (showChord && e.shiftKey) {
        const next = {
          ...step,
          on: true,
          chord: (step.chord + 1) % CHORD_SHAPES.length,
        };
        onChange(i, next);
        onAudition(next);
        return;
      }
      drag.current = { index: i, y: e.clientY, note: step.note, moved: false };
    },
    [steps, showChord, onChange, onAudition],
  );

  const move = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current;
      if (!d || !steps[d.index].on) return;
      const semis = Math.round((d.y - e.clientY) / 8);
      const note = clampNote(d.note + semis);
      if (note === steps[d.index].note) return;
      d.moved = true;
      onChange(d.index, { ...steps[d.index], note });
    },
    [steps, onChange],
  );

  const up = useCallback(() => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const step = steps[d.index];
    if (d.moved) {
      onAudition(step);
      return;
    }
    const next = { ...step, on: !step.on };
    onChange(d.index, next);
    if (next.on) onAudition(next);
  }, [steps, onChange, onAudition]);

  const wheel = useCallback(
    (e: React.WheelEvent, i: number) => {
      const step = steps[i];
      if (!step.on) return;
      e.preventDefault();
      onChange(i, {
        ...step,
        note: clampNote(step.note + (e.deltaY < 0 ? 1 : -1)),
      });
    },
    [steps, onChange],
  );

  return (
    <div className="groove-note-grid">
      {Array.from({ length: STEPS }, (_, i) => {
        const step = steps[i];
        const className = `groove-pad groove-note-pad${
          step.on ? " groove-pad-on" : ""
        }${i === current ? " groove-pad-playing" : ""}${
          i % 4 === 0 ? " groove-pad-beat" : ""
        }`;
        return (
          <button
            key={i}
            type="button"
            className={className}
            aria-label={`${unit} step ${i + 1}`}
            aria-pressed={step.on}
            title={`Click to toggle · drag up/down or scroll to change pitch${
              showChord ? " · shift-click to change chord" : ""
            }`}
            onPointerDown={(e) => down(e, i)}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            onWheel={(e) => wheel(e, i)}
          >
            <span className="groove-note-name">
              {step.on ? noteName(step.note) : ""}
            </span>
            {showChord && (
              <span className="groove-note-chord">
                {step.on ? CHORD_SHAPES[step.chord].name : ""}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

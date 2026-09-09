"use client";

import { useEffect, useRef, useState } from "react";
import type { DrumLane, DrumPattern } from "@/lib/groove/types";
import { DRUM_LANES, STEPS } from "@/lib/groove/types";

const LANE_LABEL: Record<DrumLane, string> = {
  kick: "KICK",
  snare: "SNARE",
  clap: "CLAP",
  hat: "C HAT",
  ohat: "O HAT",
  perc: "PERC",
};

interface DrumGridProps {
  pattern: DrumPattern;
  current: number;
  onSet: (
    lane: DrumLane,
    index: number,
    value: number,
    audition: boolean,
  ) => void;
}

export function DrumGrid({ pattern, current, onSet }: DrumGridProps) {
  const paint = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const up = () => {
      paint.current = null;
      setDragging(false);
    };
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);

  return (
    <div className="groove-drum-grid">
      {DRUM_LANES.map((lane) => (
        <div className="groove-drum-row" key={lane}>
          <span className="groove-lane-name">{LANE_LABEL[lane]}</span>
          <div className="groove-lane-steps">
            {Array.from({ length: STEPS }, (_, i) => {
              const v = pattern[lane][i];
              const className = `groove-pad groove-pad-v${v}${
                i === current ? " groove-pad-playing" : ""
              }${i % 4 === 0 ? " groove-pad-beat" : ""}`;
              return (
                <button
                  key={i}
                  type="button"
                  className={className}
                  aria-label={`${LANE_LABEL[lane]} step ${i + 1}`}
                  aria-pressed={v > 0}
                  title="Click to cycle rest / hit / accent · drag across to paint"
                  onPointerDown={() => {
                    const next = (v + 1) % 3;
                    paint.current = next;
                    setDragging(true);
                    onSet(lane, i, next, true);
                  }}
                  onPointerEnter={() => {
                    if (dragging && paint.current !== null)
                      onSet(lane, i, paint.current, false);
                  }}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

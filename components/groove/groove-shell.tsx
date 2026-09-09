"use client";

import { useState } from "react";
import { LedStrip } from "@/components/groove/led-strip";
import { Unit } from "@/components/groove/unit";
import { clonePatch, PATCHES } from "@/lib/groove/patches";
import type { DrumLane, MelodicStep, UnitId } from "@/lib/groove/types";
import styles from "./groove-shell.module.css";

const UNITS: UnitId[] = ["drums", "bass", "pads", "lead"];

const NO_MUTES: Record<UnitId, boolean> = {
  drums: false,
  bass: false,
  pads: false,
  lead: false,
};

export function GrooveShell() {
  const [patch] = useState(() => clonePatch(PATCHES[0]));
  const [mutes, setMutes] = useState(NO_MUTES);
  const [current] = useState(-1);

  const toggleMute = (id: UnitId) => {
    setMutes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const onDrumStep = (
    _unit: UnitId,
    lane: DrumLane,
    index: number,
    value: number,
    _audition: boolean,
  ) => {
    // 4.4 owns editing; this surface is read-only in 4.3. Keep the callback to
    // satisfy Unit's contract and to prove the wiring compiles.
    void lane;
    void index;
    void value;
  };

  const onNoteStep = (_unit: UnitId, _index: number, _step: MelodicStep) => {
    // Read-only in 4.3.
  };

  const onAudition = (_unit: UnitId, _step: MelodicStep) => {
    // Audition lands in 4.5.
  };

  const onParam = (_unit: UnitId, _key: string, _value: number) => {
    // Read-only in 4.3.
  };

  return (
    <div className={styles["groove-shell"]}>
      <div className={styles["groove-transport"]} aria-label="Groove transport">
        <span className={styles["groove-brand"]}>GROOVEBOX GX-4</span>
        <button
          type="button"
          className={styles["groove-play"]}
          aria-label="Transport"
          disabled
        >
          PLAY
        </button>
        <span className={styles["groove-patch"]} aria-label="Active patch">
          A · {patch.name}
        </span>
        <span className={styles["groove-meta"]} aria-label="Tempo">
          {patch.bpm} BPM
        </span>
      </div>

      <main className={styles["groove-deck"]}>
        {UNITS.map((id) => (
          <Unit
            key={id}
            id={id}
            patch={patch}
            current={current}
            muted={mutes[id]}
            onMute={() => toggleMute(id)}
            onParam={(k, v) => onParam(id, k, v)}
            onDrumStep={(lane, index, value, audition) =>
              onDrumStep(id, lane, index, value, audition)
            }
            onNoteStep={(index, step) => onNoteStep(id, index, step)}
            onAudition={(step) => onAudition(id, step)}
          />
        ))}
      </main>

      <div className={styles["groove-master"]} aria-label="Groove master strip">
        <span className={styles["groove-master-title"]}>MASTER · FILTER</span>
        <LedStrip current={current} />
        <span className={styles["groove-master-copy"]}>
          Master panel lands in 4.6.
        </span>
      </div>
    </div>
  );
}

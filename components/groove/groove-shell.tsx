"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LedStrip } from "@/components/groove/led-strip";
import { Transport } from "@/components/groove/transport";
import { Unit } from "@/components/groove/unit";
import {
  patchIsDirty,
  setBpm,
  setDrumStep,
  setNoteStep,
  setSwing,
  setUnitParam,
} from "@/lib/groove/patch-edit";
import { clonePatch, PATCHES } from "@/lib/groove/patches";
import type { DrumLane, MelodicStep, Patch, UnitId } from "@/lib/groove/types";
import styles from "./groove-shell.module.css";

const UNITS: UnitId[] = ["drums", "bass", "pads", "lead"];

const NO_MUTES: Record<UnitId, boolean> = {
  drums: false,
  bass: false,
  pads: false,
  lead: false,
};

const FACTORY = PATCHES.map(clonePatch);

export function GrooveShell() {
  const [patches, setPatches] = useState<Patch[]>(() => FACTORY);
  const [index, setIndex] = useState(0);
  const [mutes, setMutes] = useState(NO_MUTES);
  const [playing, setPlaying] = useState(false);
  const [current] = useState(-1);

  const patch = patches[index];

  const toggleMute = (id: UnitId) => {
    setMutes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const edit = useCallback(
    (fn: (p: Patch) => Patch) => {
      setPatches((prev) => prev.map((p, i) => (i === index ? fn(p) : p)));
    },
    [index],
  );

  const onSelect = (i: number) => setIndex(i);

  const togglePlay = () => {
    setPlaying((prev) => !prev);
  };

  const onBpm = (v: number) => edit((p) => setBpm(p, v));
  const onSwing = (v: number) => edit((p) => setSwing(p, v));
  const onRevert = () => edit(() => clonePatch(FACTORY[index]));

  const onDrumStep = (lane: DrumLane, index: number, value: number) => {
    edit((p) => setDrumStep(p, lane, index, value));
  };

  const onNoteStep = (idx: number, step: MelodicStep) => {
    const unit = UNITS.find((id) => id !== "drums");
    if (!unit || (unit !== "bass" && unit !== "pads" && unit !== "lead"))
      return;
    edit((p) => setNoteStep(p, unit, idx, step));
  };

  const onAudition = (_step: MelodicStep) => {
    // Audition lands in 4.5.
  };

  const onParam = (unit: UnitId, key: string, value: number) => {
    edit((p) => setUnitParam(p, unit, key, value));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target instanceof HTMLInputElement) return;
      if (target && target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        setPlaying((prev) => !prev);
      } else if (e.key >= "1" && e.key <= "4") {
        setIndex(Number(e.key) - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const edited = useMemo(
    () => patchIsDirty(patch, FACTORY[index]),
    [patch, index],
  );

  return (
    <div className={styles["groove-shell"]}>
      <Transport
        patches={FACTORY}
        index={index}
        onSelect={onSelect}
        playing={playing}
        onPlay={togglePlay}
        bpm={patch.bpm}
        onBpm={onBpm}
        swing={patch.swing}
        onSwing={onSwing}
        current={current}
        edited={edited}
        onRevert={onRevert}
      />

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
            onDrumStep={onDrumStep}
            onNoteStep={onNoteStep}
            onAudition={onAudition}
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

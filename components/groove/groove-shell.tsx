"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LedStrip } from "@/components/groove/led-strip";
import { Transport } from "@/components/groove/transport";
import { Unit } from "@/components/groove/unit";
import { Engine, type EngineState } from "@/lib/groove/audio/engine";
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
const VOLUME = 0.8;

export function GrooveShell() {
  const [patches, setPatches] = useState<Patch[]>(() => FACTORY);
  const [index, setIndex] = useState(0);
  const [mutes, setMutes] = useState(NO_MUTES);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(-1);

  const stateRef = useRef<EngineState>({
    patch: patches[0],
    mutes: NO_MUTES,
    volume: VOLUME,
  });

  const engineRef = useRef<Engine | null>(null);

  const patch = patches[index];

  // Write the latest state into the ref *after* render. The engine reads
  // this every audio tick, so live edits land in the graph on the next step.
  useEffect(() => {
    stateRef.current = { patch, mutes, volume: VOLUME };
  }, [patch, mutes]);

  // Construct the engine once on the client. No-op on the server.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const engine = new Engine(() => stateRef.current);
    engine.onStep = setCurrent;
    engineRef.current = engine;
    return () => {
      engine.stop();
      engineRef.current = null;
    };
  }, []);

  // Push live control changes into the audio graph.
  useEffect(() => {
    if (!playing) engineRef.current?.applyParams(stateRef.current);
  }, [patch, mutes, playing]);

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

  const togglePlay = async () => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.ctx.state !== "running") {
      try {
        await engine.resume();
      } catch {
        // Browser autoplay policies can reject until a gesture — ignore here
        // because the click itself qualifies as a gesture.
      }
    }
    if (playing) {
      engine.stop();
      setPlaying(false);
    } else {
      engine.start();
      setPlaying(true);
    }
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

  const onAudition = (step: MelodicStep) => {
    const engine = engineRef.current;
    if (!engine) return;
    void engine.resume();
    engine.auditionNote("bass", step);
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
        void togglePlay();
      } else if (e.key >= "1" && e.key <= "4") {
        setIndex(Number(e.key) - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay]);

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

"use client";

import type { DrumLane, MelodicStep, Patch, UnitId } from "@/lib/groove/types";
import { DRUM_LANES } from "@/lib/groove/types";
import { UNIT_META, UNIT_PARAMS } from "@/lib/groove/params";
import { Knob } from "./knob";
import { Fader } from "./fader";
import { LedStrip } from "./led-strip";
import { DrumGrid } from "./drum-grid";
import { NoteGrid } from "./note-grid";
import { VelocityLane } from "./velocity-lane";
import { useReadout } from "./use-readout";

interface UnitProps {
  id: UnitId;
  patch: Patch;
  current: number;
  muted: boolean;
  onMute: () => void;
  onParam: (key: string, value: number) => void;
  onDrumStep: (
    lane: DrumLane,
    index: number,
    value: number,
    audition: boolean,
  ) => void;
  onNoteStep: (index: number, step: MelodicStep) => void;
  onAudition: (step: MelodicStep) => void;
}

function activeCount(patch: Patch, id: UnitId): number {
  if (id === "drums") {
    return DRUM_LANES.reduce(
      (n, lane) => n + patch.drums.steps[lane].filter(Boolean).length,
      0,
    );
  }
  return patch[id].steps.filter((s) => s.on).length;
}

function isHitting(patch: Patch, id: UnitId, current: number): boolean {
  if (current < 0) return false;
  if (id === "drums")
    return DRUM_LANES.some((lane) => patch.drums.steps[lane][current] > 0);
  return patch[id].steps[current].on;
}

export function Unit(props: UnitProps) {
  const { id, patch, current, muted, onMute, onParam } = props;
  const meta = UNIT_META[id];
  const specs = UNIT_PARAMS[id];
  const params = patch[id].params;
  const readout = useReadout();

  const knobs = specs.filter((s) => s.kind === "knob");
  const faders = specs.filter((s) => s.kind === "slider");
  const hits = activeCount(patch, id);
  const idleLabel = id === "drums" ? "HITS" : "STEPS";
  const idleValue = id === "drums" ? `${hits}` : `${hits}/16`;

  return (
    <section
      role="region"
      aria-label={meta.name}
      className={`groove-unit groove-unit-${id}${muted ? " groove-unit-muted" : ""}`}
    >
      <header className="groove-unit-head">
        <span
          className={`groove-sig-led${
            isHitting(patch, id, current) ? " groove-sig-led-on" : ""
          }`}
          aria-hidden="true"
        />
        <span className="groove-unit-name">{meta.name}</span>
        <span className="groove-unit-model">{meta.model}</span>
        <div className="groove-unit-display" aria-live="polite">
          <span className="groove-disp-label">
            {readout.value ? readout.value.label : idleLabel}
          </span>
          <span className="groove-disp-value">
            {readout.value ? readout.value.value : idleValue}
          </span>
        </div>
        <button
          type="button"
          className={`groove-mute-btn${muted ? " groove-mute-btn-active" : ""}`}
          onClick={onMute}
        >
          MUTE
        </button>
      </header>

      <div className="groove-unit-controls">
        <div className="groove-knob-bank">
          {knobs.map((spec) => (
            <Knob
              key={spec.key}
              spec={spec}
              value={params[spec.key]}
              onChange={(v) => {
                onParam(spec.key, v);
                readout.show(spec, v);
              }}
              testId={`groove-${id}-knob-${spec.key}`}
            />
          ))}
        </div>
        <div className="groove-fader-bank">
          {faders.map((spec) => (
            <Fader
              key={spec.key}
              spec={spec}
              value={params[spec.key]}
              onChange={(v) => {
                onParam(spec.key, v);
                readout.show(spec, v);
              }}
              testId={`groove-${id}-fader-${spec.key}`}
            />
          ))}
        </div>
      </div>

      <div className="groove-unit-seq">
        <LedStrip current={current} />
        {id === "drums" ? (
          <DrumGrid
            pattern={patch.drums.steps}
            current={current}
            onSet={props.onDrumStep}
          />
        ) : (
          <>
            <NoteGrid
              unit={meta.name}
              steps={patch[id].steps}
              current={current}
              showChord={id === "pads"}
              onChange={props.onNoteStep}
              onAudition={props.onAudition}
            />
            <VelocityLane
              steps={patch[id].steps}
              current={current}
              onChange={props.onNoteStep}
            />
          </>
        )}
      </div>
    </section>
  );
}

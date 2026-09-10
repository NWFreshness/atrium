"use client";

import { useCallback, useRef } from "react";
import type { ParamSpec } from "@/lib/groove/types";
import { Knob } from "./knob";
import { LedStrip } from "./led-strip";
import type { Patch } from "@/lib/groove/types";

interface TransportProps {
  patches: Patch[];
  index: number;
  onSelect: (i: number) => void;
  playing: boolean;
  onPlay: () => void;
  bpm: number;
  onBpm: (v: number) => void;
  swing: number;
  onSwing: (v: number) => void;
  current: number;
  edited: boolean;
  onRevert: () => void;
}

const PATCH_SLOT = ["A", "B", "C", "D"];

const SWING_SPEC: ParamSpec = {
  key: "swing",
  label: "SWING",
  kind: "knob",
  min: 0,
  max: 1,
};

function TempoDial({
  bpm,
  onBpm,
}: {
  bpm: number;
  onBpm: (v: number) => void;
}) {
  const drag = useRef<{ y: number; start: number } | null>(null);
  const down = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as Element).setPointerCapture(e.pointerId);
      drag.current = { y: e.clientY, start: bpm };
    },
    [bpm],
  );
  const move = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const next = d.start + (d.y - e.clientY) / (e.shiftKey ? 12 : 3);
      onBpm(Math.max(60, Math.min(180, Math.round(next))));
    },
    [onBpm],
  );
  const up = useCallback(() => {
    drag.current = null;
  }, []);

  return (
    <div className="groove-tempo">
      <button
        type="button"
        className="groove-tempo-step"
        aria-label="Tempo down"
        onClick={() => onBpm(Math.max(60, bpm - 1))}
      >
        −
      </button>
      <div
        className="groove-tempo-read"
        title="Drag up/down to change tempo"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <span className="groove-tempo-value">{bpm}</span>
        <span className="groove-tempo-unit">BPM</span>
      </div>
      <button
        type="button"
        className="groove-tempo-step"
        aria-label="Tempo up"
        onClick={() => onBpm(Math.min(180, bpm + 1))}
      >
        +
      </button>
    </div>
  );
}

export function Transport(p: TransportProps) {
  return (
    <header className="groove-transport-row" aria-label="Groove transport">
      <div className="groove-brand">
        <span className="groove-brand-name">GROOVEBOX</span>
        <span className="groove-brand-model">GX-4</span>
      </div>

      <button
        type="button"
        className={`groove-play-btn${p.playing ? " groove-play-btn-active" : ""}`}
        aria-label={p.playing ? "STOP" : "PLAY"}
        title="Spacebar"
        onClick={p.onPlay}
      >
        <span
          className={`groove-play-led${p.playing ? " groove-play-led-on" : ""}`}
          aria-hidden="true"
        />
        <span className="groove-play-glyph" aria-hidden="true">
          {p.playing ? (
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <rect x="1.5" y="1.5" width="9" height="9" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <path d="M2.5 1.5 10 6l-7.5 4.5z" />
            </svg>
          )}
        </span>
        {p.playing ? "STOP" : "PLAY"}
      </button>

      <TempoDial bpm={p.bpm} onBpm={p.onBpm} />

      <div className="groove-swing-bank">
        <Knob spec={SWING_SPEC} value={p.swing} onChange={p.onSwing} />
      </div>

      <div className="groove-master-leds">
        <LedStrip current={p.current} />
        <span className="groove-master-leds-label">STEP</span>
      </div>

      <div className="groove-patch-bank">
        {p.patches.map((patch, i) => (
          <button
            key={patch.name}
            type="button"
            className={`groove-patch-btn${i === p.index ? " groove-patch-btn-active" : ""}`}
            aria-label={`${patch.name} ${patch.subtitle}`}
            title={`${patch.name} — ${patch.subtitle} (key ${i + 1})`}
            onClick={() => p.onSelect(i)}
          >
            <span className="groove-patch-slot" aria-hidden="true">
              {PATCH_SLOT[i]}
            </span>
            <span className="groove-patch-text">
              <span className="groove-patch-name">{patch.name}</span>
              <span className="groove-patch-sub">{patch.subtitle}</span>
            </span>
          </button>
        ))}
        <button
          type="button"
          className="groove-revert-btn"
          aria-label={p.edited ? "Revert patch" : "Patch saved"}
          onClick={p.onRevert}
          disabled={!p.edited}
          title="Restore this patch to its factory settings"
        >
          {p.edited ? "REVERT" : "SAVED"}
        </button>
      </div>
    </header>
  );
}

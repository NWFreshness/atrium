"use client";

import { useCallback, useRef } from "react";
import type { ParamSpec } from "@/lib/groove/types";

interface FaderProps {
  spec: ParamSpec;
  value: number;
  onChange: (v: number) => void;
  onTouch?: () => void;
  testId?: string;
}

export function Fader({ spec, value, onChange, onTouch, testId }: FaderProps) {
  const drag = useRef<{ y: number; start: number } | null>(null);
  const range = spec.max - spec.min;
  const norm = range > 0 ? (value - spec.min) / range : 0;

  const down = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as Element).setPointerCapture(e.pointerId);
      drag.current = { y: e.clientY, start: value };
      onTouch?.();
    },
    [value, onTouch],
  );

  const move = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const raw =
        d.start + ((d.y - e.clientY) / (e.shiftKey ? 500 : 150)) * range;
      onChange(Math.max(spec.min, Math.min(spec.max, raw)));
    },
    [onChange, range, spec.max, spec.min],
  );

  const up = useCallback(() => {
    drag.current = null;
  }, []);

  return (
    <div
      className="groove-fader"
      data-testid={testId}
      title={`${spec.label} — drag up/down`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <div className="groove-fader-slot">
        <div
          className="groove-fader-fill"
          style={{ height: `${norm * 100}%` }}
        />
        <div
          className="groove-fader-cap"
          style={{ bottom: `calc(${norm * 100}% - 4px)` }}
        />
      </div>
      <span className="groove-fader-label">{spec.label}</span>
    </div>
  );
}

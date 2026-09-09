"use client";

import { useCallback, useRef } from "react";
import type { ParamSpec } from "@/lib/groove/types";

const START = -135;
const END = 135;

interface KnobProps {
  spec: ParamSpec;
  value: number;
  onChange: (v: number) => void;
  onTouch?: () => void;
  testId?: string;
}

export function Knob({ spec, value, onChange, onTouch, testId }: KnobProps) {
  const drag = useRef<{ y: number; start: number } | null>(null);
  const range = spec.max - spec.min;

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
      const sensitivity = e.shiftKey ? 620 : 190;
      const raw = d.start + ((d.y - e.clientY) / sensitivity) * range;
      const clamped = Math.max(spec.min, Math.min(spec.max, raw));
      onChange(spec.options || spec.integer ? Math.round(clamped) : clamped);
    },
    [onChange, range, spec.max, spec.min, spec.options, spec.integer],
  );

  const up = useCallback(() => {
    drag.current = null;
  }, []);

  const norm = range > 0 ? (value - spec.min) / range : 0;
  const angle = START + norm * (END - START);

  return (
    <div
      className="groove-knob"
      data-testid={testId}
      title={`${spec.label} — drag up/down, hold shift for fine`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <svg viewBox="0 0 48 48" className="groove-knob-svg">
        <path
          d={arcPath(20, START, END)}
          className="groove-knob-track"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.18"
          strokeWidth="3"
        />
        <path
          d={arcPath(20, START, Math.max(START + 0.01, angle))}
          className="groove-knob-value"
          fill="none"
          stroke="var(--groove-accent, #ecad0a)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle
          cx="24"
          cy="24"
          r="14.5"
          fill="currentColor"
          fillOpacity="0.55"
        />
        <line
          x1={polar(5, angle)[0]}
          y1={polar(5, angle)[1]}
          x2={polar(13, angle)[0]}
          y2={polar(13, angle)[1]}
          stroke="#fff"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="groove-knob-label">{spec.label}</span>
    </div>
  );
}

function polar(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [24 + r * Math.cos(a), 24 + r * Math.sin(a)];
}

function arcPath(r: number, from: number, to: number): string {
  const [x1, y1] = polar(r, from);
  const [x2, y2] = polar(r, to);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

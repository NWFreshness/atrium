"use client";

import { useEffect, useRef } from "react";
import { filterGainAt } from "@/lib/groove/filter";

const MIN_HZ = 30;
const MAX_HZ = 18000;
const GRID = [100, 1000, 10000];

interface ScopeProps {
  analyser: AnalyserNode | null;
  /** read fresh every frame so the curve tracks the sweep, not React state */
  getFilter: () => { macro: number; reso: number };
}

/** Live spectrum with the master filter's response drawn over it. */
export function Scope({ analyser, getFilter }: ScopeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    const bins = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    let raf = 0;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx2d.clearRect(0, 0, w, h);

      const xOf = (f: number) =>
        (Math.log(f / MIN_HZ) / Math.log(MAX_HZ / MIN_HZ)) * w;

      ctx2d.strokeStyle = "rgba(120,132,150,0.16)";
      ctx2d.lineWidth = 1;
      for (const f of GRID) {
        const x = Math.round(xOf(f)) + 0.5;
        ctx2d.beginPath();
        ctx2d.moveTo(x, 0);
        ctx2d.lineTo(x, h);
        ctx2d.stroke();
      }

      if (analyser && bins) {
        analyser.getByteFrequencyData(bins);
        const nyquist = analyser.context.sampleRate / 2;
        ctx2d.beginPath();
        ctx2d.moveTo(0, h);
        for (let x = 0; x <= w; x += 2) {
          const f = MIN_HZ * Math.pow(MAX_HZ / MIN_HZ, x / w);
          const bin = Math.min(
            bins.length - 1,
            Math.round((f / nyquist) * bins.length),
          );
          const v = bins[bin] / 255;
          ctx2d.lineTo(x, h - v * h * 0.95);
        }
        ctx2d.lineTo(w, h);
        ctx2d.closePath();
        ctx2d.fillStyle = "rgba(46,166,223,0.28)";
        ctx2d.fill();
        ctx2d.strokeStyle = "rgba(80,196,255,0.75)";
        ctx2d.lineWidth = 1.2;
        ctx2d.stroke();
      }

      const { macro, reso } = getFilter();
      ctx2d.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const f = MIN_HZ * Math.pow(MAX_HZ / MIN_HZ, x / w);
        const db =
          20 * Math.log10(Math.max(1e-4, filterGainAt(macro, reso, f)));
        const y = h * (1 - (Math.max(-48, Math.min(12, db)) + 48) / 60);
        if (x === 0) ctx2d.moveTo(x, y);
        else ctx2d.lineTo(x, y);
      }
      ctx2d.strokeStyle = "#ecad0a";
      ctx2d.lineWidth = 1.8;
      ctx2d.shadowColor = "rgba(236,173,10,0.55)";
      ctx2d.shadowBlur = 7;
      ctx2d.stroke();
      ctx2d.shadowBlur = 0;

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [analyser, getFilter]);

  return (
    <div
      className="groove-scope"
      role="img"
      aria-label="Live spectrum and filter response"
    >
      <canvas ref={canvasRef} className="groove-scope-canvas" />
      <span className="groove-scope-tag">SPECTRUM · FILTER</span>
    </div>
  );
}

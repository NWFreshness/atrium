"use client";

import { useEffect, useRef } from "react";
import type { Params, ParamSpec } from "@/lib/groove/types";
import { SWEEP_BARS } from "@/lib/groove/types";
import { FILTER_SPEC, MASTER_GROUPS } from "@/lib/groove/params";
import { filterLabel } from "@/lib/groove/filter";
import { Fader } from "./fader";
import { Knob } from "./knob";
import { Scope } from "./scope";
import { useReadout } from "./use-readout";

interface MasterProps {
  params: Params;
  onParam: (key: string, value: number) => void;
  volume: number;
  onVolume: (v: number) => void;
  analyser: AnalyserNode | null;
  getFilter: () => { macro: number; reso: number };
  /** live macro position, which follows the sweep while playing */
  liveFilter: number;
  sweepPhase: number;
}

const VOLUME_SPEC: ParamSpec = {
  key: "volume",
  label: "VOL",
  kind: "slider",
  min: 0,
  max: 1,
};

/** Segmented phrase counter showing where the sweep is in its cycle. */
function SweepMeter({ bars, phase }: { bars: number; phase: number }) {
  if (bars === 0) {
    return (
      <div className="groove-sweep-meter groove-sweep-meter-off">
        <span className="groove-sweep-off">SWEEP OFF</span>
      </div>
    );
  }
  const active = Math.min(bars - 1, Math.floor(phase * bars));
  return (
    <div className="groove-sweep-meter">
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          className={`groove-sweep-seg${i === active ? " groove-sweep-seg-on" : ""}`}
        >
          {i === active && (
            <span
              className="groove-sweep-fill"
              style={{ width: `${(phase * bars - i) * 100}%` }}
            />
          )}
        </span>
      ))}
    </div>
  );
}

/** Twin output meters: peak-hold and slow average of the live output. */
function VuMeter({ analyser }: { analyser: AnalyserNode | null }) {
  const peakRef = useRef<HTMLSpanElement>(null);
  const avgRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const peak = peakRef.current;
    const avg = avgRef.current;
    if (!peak || !avg || !analyser) return;
    const bins = new Uint8Array(analyser.fftSize);
    let raf = 0;
    let held = 0;
    let slow = 0;

    const tick = () => {
      analyser.getByteTimeDomainData(bins);
      let sum = 0;
      for (let i = 0; i < bins.length; i += 1) {
        const v = (bins[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.min(1, Math.sqrt(sum / bins.length) * 2.6);
      held = Math.max(rms, held * 0.88);
      slow += (rms - slow) * 0.12;
      peak.style.height = `${(1 - held) * 100}%`;
      avg.style.height = `${(1 - slow) * 100}%`;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [analyser]);

  return (
    <div className="groove-meter">
      <div className="groove-vu" aria-hidden="true">
        <span className="groove-tube">
          <span className="groove-tube-lvl" ref={peakRef} />
        </span>
        <span className="groove-tube">
          <span className="groove-tube-lvl" ref={avgRef} />
        </span>
      </div>
      <div className="groove-vu-labels">
        <span>PEAK</span>
        <span>AVG</span>
      </div>
    </div>
  );
}

export function Master(p: MasterProps) {
  const readout = useReadout();
  const bars = SWEEP_BARS[Math.round(p.params.sweepBars)] ?? 0;

  return (
    <section className="groove-master-strip" aria-label="Groove master">
      <p className="groove-nameplate">MASTER</p>
      <div className="groove-master-hero">
        <div className="groove-hero-knob">
          <Knob
            spec={FILTER_SPEC}
            value={p.params.filter}
            onChange={(v) => {
              p.onParam("filter", v);
              readout.show(FILTER_SPEC, v);
            }}
            testId="groove-master-filter"
          />
        </div>
        <div className="groove-hero-side">
          <span className="groove-bank-label">MASTER FILTER</span>
          <div className="groove-hero-display">
            <span className="groove-disp-label">
              {readout.value ? readout.value.label : "CUTOFF"}
            </span>
            <span className="groove-disp-value">
              {readout.value ? readout.value.value : filterLabel(p.liveFilter)}
            </span>
          </div>
          <SweepMeter bars={bars} phase={p.sweepPhase} />
        </div>
      </div>

      {MASTER_GROUPS.map((group) => (
        <div className="groove-master-group" key={group.title}>
          <span className="groove-bank-label">{group.title}</span>
          <div className="groove-master-knobs">
            {group.specs.map((spec) => (
              <Knob
                key={spec.key}
                spec={spec}
                value={p.params[spec.key]}
                onChange={(v) => {
                  p.onParam(spec.key, v);
                  readout.show(spec, v);
                }}
                testId={`groove-master-${spec.key}`}
              />
            ))}
          </div>
        </div>
      ))}

      <Scope analyser={p.analyser} getFilter={p.getFilter} />

      <div className="groove-master-out">
        <span className="groove-bank-label">OUT</span>
        <Fader
          spec={VOLUME_SPEC}
          value={p.volume}
          onChange={p.onVolume}
          testId="groove-master-volume"
        />
        <VuMeter analyser={p.analyser} />
      </div>
    </section>
  );
}

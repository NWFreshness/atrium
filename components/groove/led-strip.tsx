import { STEPS } from "@/lib/groove/types";

export function LedStrip({ current }: { current: number }) {
  return (
    <div className="groove-leds" role="presentation" data-testid="groove-leds">
      {Array.from({ length: STEPS }, (_, i) => (
        <span
          key={i}
          className={`groove-led${i === current ? " groove-led-on" : ""}${
            i % 4 === 0 ? " groove-led-beat" : ""
          }`}
        />
      ))}
    </div>
  );
}

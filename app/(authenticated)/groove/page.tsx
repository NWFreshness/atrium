import { GrooveShell } from "@/components/groove/groove-shell";

export default function GroovePage() {
  return (
    <main aria-label="Groove">
      <h1 className="groove-sr-only">Groove</h1>
      <GrooveShell />
    </main>
  );
}

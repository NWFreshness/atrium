import { GrooveShell } from "@/components/groove/groove-shell";
import "@/components/groove/groove-shell.module.css";

export default function GroovePage() {
  return (
    <main className="groove-page" aria-label="Groove">
      <div className="atrium-pagetitle">
        <h1>Groove</h1>
        <p className="atrium-sub">
          Groovebox G-4 · four units, one transport · Web Audio only
        </p>
      </div>
      <GrooveShell />
    </main>
  );
}

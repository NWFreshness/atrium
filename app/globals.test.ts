import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globals = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

describe("PNW design tokens (globals.css)", () => {
  it("defines the basalt dark tokens in :root", () => {
    expect(globals).toContain("--bg-0: #25282a");
    expect(globals).toContain("--bg-1: #2b3330");
    expect(globals).toContain("--bg-2: #313b37");
    expect(globals).toContain("--bg-3: #39443f");
    expect(globals).toContain("--ink: #eef1f2");
    expect(globals).toContain("--ink-dim: #b3bfa9");
    expect(globals).toContain("--brass: #dfa84a");
    expect(globals).toContain("--moss: #2d4a3e");
    expect(globals).toContain("--clay: #b87355");
    expect(globals).toContain("--slate: #8b9fc2");
    expect(globals).toContain("--clay-ink: #e0a488");
    expect(globals).toContain("--timber: #b9ab93");
    expect(globals).not.toMatch(/--violet\s*:/);
  });

  it("defines matching mist values under [data-theme=light]", () => {
    expect(globals).toContain('[data-theme="light"]');
    expect(globals).toContain("--bg-0: #eef1f2");
    expect(globals).toContain("--ink: #25282a");
    expect(globals).toContain("--brass: #8a6320");
  });

  it("maps the display/sans/mono type stack to the loaded font variables", () => {
    expect(globals).toContain("--font-display: var(--font-outfit)");
    expect(globals).toContain("--font-sans: var(--font-archivo)");
    expect(globals).toMatch(/--font-mono:\s*var\(--font-geist-mono\)/);
  });

  it("keeps the --background/--foreground aliases per-app modules rely on", () => {
    expect(globals).toContain("--background: var(--bg-0)");
    expect(globals).toContain("--foreground: var(--ink)");
  });
});

describe("base + overlays", () => {
  it("body uses the basalt surface, mist ink, and sans stack", () => {
    expect(globals).toContain("background: var(--bg-0)");
    expect(globals).toContain("color: var(--ink)");
    expect(globals).toContain("font-family: var(--font-sans)");
  });

  it("adds a non-interactive grain overlay and a clearing-sky layer", () => {
    expect(globals).toContain("body::before");
    expect(globals).toContain("body::after");
    expect(globals).toMatch(/::before\s*{[^}]*pointer-events:\s*none/);
    expect(globals).toMatch(/::after\s*{[^}]*pointer-events:\s*none/);
    expect(globals).toContain("fractalNoise");
    expect(globals).toContain("radial-gradient");
    expect(globals).toContain("@keyframes sky-drift");
  });

  it("tints text selection brass", () => {
    expect(globals).toContain("::selection");
    expect(globals).toContain("background: var(--brass-soft)");
  });
});

describe("motion primitives", () => {
  it("defines the reveal stagger keyframed on a --i step index", () => {
    expect(globals).toContain("@keyframes reveal");
    expect(globals).toContain("animation: reveal 0.65s");
    expect(globals).toContain("calc(var(--i, 0) * 70ms)");
  });

  it("disables reveal and sky drift under prefers-reduced-motion", () => {
    expect(globals).toContain("@media (prefers-reduced-motion: reduce)");
    expect(globals).toContain("transition-duration: 0.01ms !important");
    const media = globals.slice(
      globals.indexOf("@media (prefers-reduced-motion: reduce)"),
    );
    expect(media).toMatch(/body::after\s*\{[^}]*animation:\s*none/);
  });
});

describe("no per-app module edits", () => {
  it("globals.css does not re-define per-app namespaces", () => {
    expect(globals).not.toMatch(/\.crm-/);
    expect(globals).not.toMatch(/\.space-/);
    expect(globals).not.toMatch(/\.rolodex-/);
    expect(globals).not.toMatch(/\.groove-/);
    expect(globals).not.toMatch(/atrium-nav/);
  });
});

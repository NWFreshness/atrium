import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globals = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

describe("Workroom design tokens (globals.css)", () => {
  it("defines the espresso dark tokens in :root", () => {
    expect(globals).toContain("--bg-0: #13100c");
    expect(globals).toContain("--bg-1: #1b1712");
    expect(globals).toContain("--bg-2: #231e16");
    expect(globals).toContain("--bg-3: #2b251b");
    expect(globals).toContain("--ink: #f0e9da");
    expect(globals).toContain("--ink-dim: #a99e88");
    expect(globals).toContain("--brass: #dfa33c");
    expect(globals).toContain("--moss: #8fae83");
    expect(globals).toContain("--clay: #cd7258");
    expect(globals).toContain("--slate: #8b9fc2");
    expect(globals).toContain("--violet: #a88fc0");
  });

  it("defines matching warm-paper values under [data-theme=light]", () => {
    expect(globals).toContain('[data-theme="light"]');
    expect(globals).toContain("--bg-0: #ece5d6");
    expect(globals).toContain("--ink: #262015");
    expect(globals).toContain("--brass: #a86f14");
  });

  it("maps the display/sans/mono type stack to the loaded font variables", () => {
    expect(globals).toContain("--font-display: var(--font-fraunces)");
    expect(globals).toContain("--font-sans: var(--font-geist-sans)");
    expect(globals).toContain("--font-mono: var(--font-geist-mono)");
  });

  it("keeps the --background/--foreground aliases per-app modules rely on", () => {
    expect(globals).toContain("--background: var(--bg-0)");
    expect(globals).toContain("--foreground: var(--ink)");
  });
});

describe("base + overlays", () => {
  it("body uses the espresso surface, warm ink, and sans stack", () => {
    expect(globals).toContain("background: var(--bg-0)");
    expect(globals).toContain("color: var(--ink)");
    expect(globals).toContain("font-family: var(--font-sans)");
  });

  it("adds a non-interactive paper-grain overlay and a top brass glow", () => {
    expect(globals).toContain("body::before");
    expect(globals).toContain("body::after");
    expect(globals).toMatch(/::before\s*{[^}]*pointer-events:\s*none/);
    expect(globals).toMatch(/::after\s*{[^}]*pointer-events:\s*none/);
    expect(globals).toContain("fractalNoise");
    expect(globals).toContain("radial-gradient");
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

  it("disables reveal under prefers-reduced-motion", () => {
    expect(globals).toContain("@media (prefers-reduced-motion: reduce)");
    expect(globals).toContain("transition-duration: 0.01ms !important");
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
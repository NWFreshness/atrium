import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globals = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

describe("rack design tokens (globals.css)", () => {
  it("defines the basalt chassis tokens in :root", () => {
    expect(globals).toContain("--bg-0: #14171a");
    expect(globals).toContain("--bg-1: #191d21");
    expect(globals).toContain("--bg-2: #1f2428");
    expect(globals).toContain("--bg-3: #272d32");
    expect(globals).toContain("--ink: #dfe5e3");
    expect(globals).toContain("--ink-dim: #a4afac");
    expect(globals).toContain("--brass: #ffb000");
    expect(globals).toContain("--moss: #58e08c");
    expect(globals).toContain("--clay: #c7513d");
    expect(globals).toContain("--slate: #7fb2ff");
    expect(globals).toContain("--clay-ink: #ff7a66");
    expect(globals).toContain("--timber: #c2b8a3");
    expect(globals).not.toMatch(/--violet\s*:/);
  });

  it("defines matching cream chassis values under [data-theme=light]", () => {
    expect(globals).toContain('[data-theme="light"]');
    expect(globals).toContain("--bg-0: #e4dfd0");
    expect(globals).toContain("--ink: #1d1c1a");
    expect(globals).toContain("--brass: #754b00");
  });

  it("maps the display/sans/mono type stack to the loaded font variables", () => {
    expect(globals).toMatch(/--font-display:\s*var\(--font-jetbrains-mono\)/);
    expect(globals).toContain("--font-sans: var(--font-plex-sans)");
    expect(globals).toMatch(/--font-mono:\s*var\(--font-jetbrains-mono\)/);
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

  it("adds a non-interactive grain overlay and a static grid-paper layer", () => {
    expect(globals).toContain("body::before");
    expect(globals).toMatch(/::before\s*{[^}]*pointer-events:\s*none/);
    // The grid is the body background, so it can never intercept a click.
    expect(globals).not.toContain("body::after");
    expect(globals).toContain("fractalNoise");
    expect(globals).toContain("var(--grid)");
    expect(globals).toContain("background-size: 20px 20px");
    expect(globals).not.toContain("@keyframes sky-drift");
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
    const media = globals.slice(
      globals.indexOf("@media (prefers-reduced-motion: reduce)"),
    );
    expect(media).toMatch(/\.reveal\s*\{[^}]*animation:\s*none/);
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

describe("theme color-scheme handshake (13.4 AC5)", () => {
  it("declares dark on :root and light on the cream override", () => {
    expect(globals).toMatch(/:root\s*\{[^}]*color-scheme:\s*dark/);
    expect(globals).toMatch(
      /\[data-theme="light"\][^{]*\{[^}]*color-scheme:\s*light/,
    );
  });
});

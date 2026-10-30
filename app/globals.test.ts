import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globals = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

describe("coral design tokens (globals.css)", () => {
  it("defines the coral paper tokens in :root", () => {
    expect(globals).toContain("--bg-0: #f4efec");
    expect(globals).toContain("--bg-1: #faf5f3");
    expect(globals).toContain("--bg-2: #fdfbf8");
    expect(globals).toContain("--bg-3: #fefdfb");
    expect(globals).toContain("--ink: #1d1614");
    expect(globals).toContain("--ink-dim: #3c3330");
    expect(globals).toContain("--brass: #b63328");
    expect(globals).toContain("--moss: #236436");
    expect(globals).toContain("--clay: #c86556");
    expect(globals).toContain("--slate: #5c493a");
    expect(globals).toContain("--clay-ink: #8e3c00");
    expect(globals).toContain("--timber: #795d3c");
    expect(globals).not.toMatch(/--violet\s*:/);
  });

  it("defines matching felt-board values under [data-theme=dark]", () => {
    expect(globals).toContain('[data-theme="dark"]');
    expect(globals).toContain("--bg-0: #130e0c");
    expect(globals).toContain("--ink: #efeae5");
    expect(globals).toContain("--brass: #ec8d7a");
  });

  it("maps the display/sans/mono type stack to the loaded font variables", () => {
    expect(globals).toMatch(/--font-display:\s*var\(--font-general-sans\)/);
    expect(globals).toContain("--font-sans: var(--font-general-sans)");
    expect(globals).toMatch(/--font-mono:\s*var\(--font-geist-mono\)/);
  });

  it("keeps the --background/--foreground aliases per-app modules rely on", () => {
    expect(globals).toContain("--background: var(--bg-0)");
    expect(globals).toContain("--foreground: var(--ink)");
  });
});

describe("base + overlays", () => {
  it("body uses the paper surface, ink, and sans stack", () => {
    expect(globals).toContain("background: var(--bg-0)");
    expect(globals).toContain("color: var(--ink)");
    expect(globals).toContain("font-family: var(--font-sans)");
  });

  it("lays no overlay on the page and keeps the felt grain a token", () => {
    // Coral: sections stay plain; the grain is only on the desk surfaces
    // that opt into --tex-felt, so nothing can sit over a click.
    expect(globals).not.toContain("body::before");
    expect(globals).not.toContain("body::after");
    expect(globals).toMatch(/--tex-felt:\s*url\("data:image\/svg\+xml[^"]*fractalNoise/);
    expect(globals).not.toContain("background-size: 20px 20px");
    expect(globals).not.toContain("@keyframes sky-drift");
  });

  it("clips horizontal overflow on html and body without 100vw", () => {
    expect(globals).toMatch(/html,\s*body\s*\{[^}]*overflow-x:\s*clip/);
    expect(globals).not.toContain("100vw");
  });

  it("tints text selection brass", () => {
    expect(globals).toContain("::selection");
    expect(globals).toContain("background: var(--brass-soft)");
  });
});

describe("motion primitives", () => {
  it("defines the reveal stagger keyframed on a --i step index", () => {
    expect(globals).toContain("@keyframes reveal");
    expect(globals).toContain("animation: reveal 0.5s");
    expect(globals).toContain("calc(var(--i, 0) * 40ms)");
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
  it("declares light on :root and dark on the felt-board override", () => {
    expect(globals).toMatch(/:root\s*\{[^}]*color-scheme:\s*light/);
    expect(globals).toMatch(
      /\[data-theme="dark"\][^{]*\{[^}]*color-scheme:\s*dark/,
    );
  });
});

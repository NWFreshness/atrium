/**
 * The client boundary, enforced by grep.
 *
 * Nothing under `components/` may reach Drizzle, `getDb`, a schema, a seed or a
 * reset — not directly, and not through a chain of modules it value-imports.
 * `/rolodex/circles` is why this file exists: the board pulled
 * `circleColumnStats` out of `move-person.ts`, which imports `queries.ts`, so
 * Google-sized chunks of the database layer shipped to the browser.
 *
 * Three honesty rules, copied from the Groove "no drizzle" test and the Accounts
 * type-only import test:
 *
 * 1. Comments are prose. File contents are stripped first, so a comment
 *    explaining why something is *not* imported cannot satisfy or break this.
 * 2. It asserts the *kind* of import. `import type { PersonComputed }` is erased
 *    at build time and stays allowed; `import { type A, B }` is a value import
 *    and is not, even though the line starts with `import type`-ish syntax.
 * 3. It follows the graph instead of trusting one file. A component can leak
 *    Drizzle through a helper three modules away, which is the case this
 *    feature was written for. `"use server"` modules are boundaries — Next
 *    replaces those imports with an RPC stub — so the walk stops there rather
 *    than following them into the database.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

type Span = { start: number; end: number };

/**
 * Source with comments removed and string literals left intact — the module
 * specifiers live inside those strings, so they cannot be masked out.
 *
 * The rules are a scanner rather than a few regexes for a reason a reviewer
 * demonstrated: `const OPEN = "/*"` followed by `const CLOSE = "*​/"` makes a
 * position-blind stripper delete every import between them, and `//` inside a
 * string is not a comment. `strings` reports the interior offsets of each
 * literal, which is how `importsOf` tells a real statement from the same text
 * quoted inside a template.
 *
 * Regex literals are skipped too, by the usual "a value can start here" test:
 * a `/["']/` left unhandled desynchronises the scanner and silently swallows
 * every import after it.
 */
function scanSource(source: string): { code: string; strings: Span[] } {
  const strings: Span[] = [];
  let code = "";
  let index = 0;
  let state: "code" | "line" | "block" | "literal" | "regex" = "code";
  let quote = "";
  let literalStart = 0;
  let inClass = false;
  let lastMeaningful = "";
  let before = "";

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1] ?? "";

    if (state === "code") {
      if (char === "/" && next === "/") {
        state = "line";
        index += 2;
        continue;
      }
      if (char === "/" && next === "*") {
        state = "block";
        index += 2;
        continue;
      }
      if (char === "/" && startsRegex(lastMeaningful, before)) {
        state = "regex";
        inClass = false;
        code += char;
        index += 1;
        continue;
      }
      if (char === '"' || char === "'" || char === "`") {
        state = "literal";
        quote = char;
        literalStart = code.length;
        code += char;
        index += 1;
        continue;
      }
      code += char;
      before = (before + char).slice(-16);
      if (!/\s/.test(char)) {
        lastMeaningful = char;
      }
      index += 1;
      continue;
    }

    if (state === "regex") {
      code += char;
      if (char === "\\") {
        code += next;
        index += 2;
        continue;
      }
      if (char === "[") {
        inClass = true;
      } else if (char === "]") {
        inClass = false;
      } else if (char === "/" && !inClass) {
        state = "code";
        lastMeaningful = "/";
      }
      index += 1;
      continue;
    }

    if (state === "line") {
      if (char === "\n") {
        state = "code";
        code += char;
      }
      index += 1;
      continue;
    }

    if (state === "block") {
      if (char === "*" && next === "/") {
        state = "code";
        index += 2;
        continue;
      }
      // Keep newlines so the remaining code stays line-aligned.
      if (char === "\n") {
        code += char;
      }
      index += 1;
      continue;
    }

    code += char;
    if (char === "\\") {
      code += next;
      index += 2;
      continue;
    }
    if (char === quote) {
      state = "code";
      strings.push({ start: literalStart, end: code.length });
    }
    index += 1;
  }

  return { code, strings };
}

const FORBIDDEN = [
  { label: "lib/db", test: /(?:^|\/)lib\/db(?:\/|$)/ },
  {
    label: "query CRUD / schema / seed / reset",
    test: /(?:^|\/)lib\/(?:crm|space|rolodex)\/(?:queries|schema|seed|reset)\b/,
  },
  { label: "drizzle-orm", test: /^drizzle-orm(?:\/|$)/ },
  {
    label: "@neondatabase/serverless",
    test: /^@neondatabase\/serverless(?:\/|$)/,
  },
];

type Import = { spec: string; value: boolean };

const inString = (index: number, strings: Span[]) =>
  strings.some((span) => index > span.start && index < span.end);

/** A `/` after a value is division; after these it opens a regex literal. */
const REGEX_PRECEDERS = "([{,;:=!&|?+-*%~^<>";
const KEYWORD_PRECEDERS =
  /(?:^|[^\w$])(?:return|typeof|case|in|of|do|else|void|new|delete|instanceof|yield|await|throw|default)\s*$/;

const startsRegex = (lastMeaningful: string, before: string) =>
  lastMeaningful === "" ||
  REGEX_PRECEDERS.includes(lastMeaningful) ||
  KEYWORD_PRECEDERS.test(before);

/**
 * Is this clause erased at build time? `import type { A }` and `export type
 * { A } from` are; so is `import { type A, type B }`, where every specifier
 * carries the keyword. `import { type A, B }` is **not** — it binds `B`, and one
 * value binding is enough to pull the module into the chunk.
 */
function typeOnlyClause(clause: string): boolean {
  const trimmed = clause.trim();
  if (/^type\b/.test(trimmed)) {
    return true;
  }
  const braces = trimmed.match(/\{([\s\S]*)\}/);
  if (!braces) {
    return false; // `import x from` / `import * as x from` bind a value
  }
  const before = trimmed
    .replace(/\{[\s\S]*\}/, "")
    .replace(/,$/, "")
    .trim();
  const specifiers = braces[1]
    .split(",")
    .map((specifier) => specifier.trim())
    .filter(Boolean);
  return (
    before === "" &&
    specifiers.length > 0 &&
    specifiers.every((specifier) => /^type\s+\S/.test(specifier))
  );
}

/**
 * Every module reference in a file, with whether it can survive into the
 * bundle, plus the dynamic imports whose target cannot be read.
 *
 * No semicolon is required anywhere: a file without them is still valid
 * TypeScript, and a gate that only saw punctuated code would report a clean
 * bill of health for a component that imports Drizzle.
 */
function importsOf(
  code: string,
  strings: Span[],
): { imports: Import[]; unreadable: string[] } {
  const imports: Import[] = [];
  const unreadable: string[] = [];

  // `import … from "x"` and `export … from "x"`, multi-line or not, anywhere a
  // statement may start — including second on a line after a `;`.
  for (const match of code.matchAll(
    /(?:^|[\n;])\s*(?:import|export)\b([\s\S]*?)\bfrom\s*["']([^"']+)["']/g,
  )) {
    // Anchor on the `from` keyword, not on the statement: inside a template the
    // anchor can land on real code while the specifier it reaches does not.
    const fromIndex = match.index + match[0].search(/\bfrom\s*["']/);
    if (inString(match.index, strings) || inString(fromIndex, strings)) {
      continue; // the same text, quoted inside a template literal
    }
    imports.push({ spec: match[2], value: !typeOnlyClause(match[1]) });
  }

  // `import "x"` — a side-effect import.
  for (const match of code.matchAll(
    /(?:^|[\n;])\s*import\s*["']([^"']+)["']/g,
  )) {
    const quoteIndex = match.index + match[0].search(/["']/);
    if (inString(quoteIndex, strings)) {
      continue;
    }
    imports.push({ spec: match[1], value: true });
  }

  // `await import("x")` / `require("x")` reach the database with no static
  // statement to read. An argument that is not a plain literal is reported as
  // unreadable rather than assumed harmless.
  for (const match of code.matchAll(/\b(?:import|require)\s*\(/g)) {
    if (inString(match.index, strings)) {
      continue;
    }
    const rest = code.slice(match.index + match[0].length);
    const literal =
      rest.match(/^\s*(["'])([^"']+)\1/) ?? rest.match(/^\s*`([^`$]*)`/);
    if (literal) {
      imports.push({ spec: literal[2], value: true });
    } else {
      unreadable.push(rest.split("\n")[0].trim().slice(0, 60));
    }
  }

  return { imports, unreadable };
}

/** A repo file, or null for a package / `node:` builtin / unresolvable path. */
function resolveSpecifier(spec: string, fromDir: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) {
    base = resolve(ROOT, spec.slice(2));
  } else if (spec.startsWith(".")) {
    base = resolve(fromDir, spec);
  } else {
    return null;
  }
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

function componentFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...componentFiles(path));
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(path);
    }
  }
  return out;
}

/** Walk the value-import graph from every client file, collecting leaks. */
function reachableLeaks() {
  const violations: string[] = [];
  const unresolved: string[] = [];
  const unreadable: string[] = [];
  const visited = new Set<string>();
  const queue = componentFiles(resolve(ROOT, "components"));
  let walked = 0;

  while (queue.length > 0) {
    const file = queue.pop() as string;
    if (visited.has(file)) {
      continue;
    }
    visited.add(file);
    walked += 1;

    const { code, strings } = scanSource(readFileSync(file, "utf8"));
    // `"use server"` is an RPC boundary: the client gets a stub, not this graph.
    if (/^["']use server["']/.test(code.trimStart())) {
      continue;
    }

    const from = relative(ROOT, file);
    const parsed = importsOf(code, strings);
    for (const target of parsed.unreadable) {
      unreadable.push(`${from} → import(${target}`);
    }

    for (const { spec, value } of parsed.imports) {
      if (!value) {
        continue;
      }
      const target = resolveSpecifier(spec, dirname(file));
      const targetPath = target ? relative(ROOT, target) : null;
      const hit = FORBIDDEN.find(
        (rule) =>
          rule.test.test(spec) ||
          (targetPath !== null && rule.test.test(targetPath)),
      );
      if (hit) {
        violations.push(`${from} → ${spec} (${hit.label})`);
        continue;
      }
      if (target) {
        queue.push(target);
      } else if (spec.startsWith(".") || spec.startsWith("@/")) {
        unresolved.push(`${from} → ${spec}`);
      }
    }
  }

  return {
    violations,
    unresolved,
    unreadable,
    walked,
    visited: [...visited].map((path) => relative(ROOT, path)),
  };
}

const REACHABLE_SAFE_MODULE = "@/lib/rolodex/constants";

describe("client boundary", () => {
  const files = componentFiles(resolve(ROOT, "components"));
  const { violations, unresolved, unreadable, walked, visited } =
    reachableLeaks();

  it("walks the whole component tree, not a sample", () => {
    // A walk that silently stops early would pass forever.
    expect(files.length).toBeGreaterThan(50);
    const walkedComponents = files
      .map((file) => relative(ROOT, file))
      .filter((file) => visited.includes(file));
    expect(walkedComponents).toHaveLength(files.length);
  });

  it("follows the graph past components/ into the modules they import", () => {
    // Component files pull in more modules from `lib/` than there are components,
    // which is where a leak hides: the file that imports the database is not the
    // one under `components/`.
    expect(walked).toBeGreaterThan(files.length);
  });

  it("resolves every relative and @/ import it follows", () => {
    // An import the walk cannot resolve is an import it cannot vouch for.
    expect(unresolved).toEqual([]);
  });

  it("reads the target of every dynamic import", () => {
    // `import(name)` cannot be checked, so it fails here instead of shipping.
    expect(unreadable).toEqual([]);
  });

  it("keeps Drizzle, getDb, schema, seed and reset out of the client graph", () => {
    expect(violations).toEqual([]);
  });

  it("follows the graph out of components/ into the modules they import", () => {
    // A component imports `@/lib/rolodex/constants`, so that file has to be in
    // the walk: it is what puts a helper three hops away in scope, which is the
    // leak this feature was written for.
    expect(resolveSpecifier(REACHABLE_SAFE_MODULE, ROOT)).toBe(
      resolve(ROOT, "lib/rolodex/constants.ts"),
    );
    expect(visited).toContain("lib/rolodex/constants.ts");
  });
});

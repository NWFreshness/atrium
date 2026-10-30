/**
 * The server-action gate.
 *
 * Next treats every export of a `"use server"` module as an endpoint a browser
 * can call with arguments of its choosing. So an action file may only hold thin
 * wrappers: resolve the tenant from the session, delegate to a plain module.
 * The per-action "a client-supplied tenantId is ignored" tests used to prove
 * this one function at a time; this proves it for every action at once, and
 * for the ones nobody has written yet.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const APPS = ["crm", "space", "rolodex"];
const files = (suffix: string) =>
  APPS.flatMap((app) =>
    readdirSync(join(root, "lib", app))
      .filter((name) => name.endsWith(suffix))
      .map((name) => `lib/${app}/${name}`),
  );
const read = (path: string) => readFileSync(join(root, path), "utf8");
/** Comments are prose; only code is held to the rules. */
const code = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** Each exported function with its parameter list and its body. */
function exportedFunctions(source: string) {
  return [
    ...source.matchAll(
      /^export (async )?function (\w+)\(([\s\S]*?)\n?\)(?::[^{]*)? \{\n([\s\S]*?)\n\}/gm,
    ),
  ].map(([, isAsync, name, params, body]) => ({
    isAsync: Boolean(isAsync),
    name,
    params,
    body,
  }));
}

const actionFiles = files("-actions.ts");
const opsFiles = files("-ops.ts");

describe("server action files are thin session wrappers", () => {
  it("finds every action file and its plain module", () => {
    expect(actionFiles).toHaveLength(17);
    expect(opsFiles).toEqual(
      actionFiles.map((file) => file.replace("-actions.ts", "-ops.ts")),
    );
  });

  it.each(actionFiles)("%s exports only async *Action wrappers", (file) => {
    const source = code(read(file));
    expect(source.trimStart().startsWith('"use server";')).toBe(true);

    const functions = exportedFunctions(source);
    expect(functions.length).toBeGreaterThan(0);
    const exports = [...source.matchAll(/^export (?!type\b)(.*)$/gm)];
    expect(exports).toHaveLength(functions.length);
    for (const { isAsync, name } of functions) {
      expect(isAsync, name).toBe(true);
      expect(name).toMatch(/Action$/);
    }
  });

  it.each(actionFiles)(
    "%s takes its tenant from the session and from nowhere else",
    (file) => {
      const source = code(read(file));
      for (const { name, params, body } of exportedFunctions(source)) {
        // One statement: delegate with the session's tenant as the first
        // argument, optionally through the shared result mapper.
        expect(body.trim(), name).toMatch(
          /^return (toResult\(\s*async \(\) =>\s*)?\w+In\(\s*await sessionTenant\(\)[,)]/,
        );
        expect(body.match(/;/g), name).toHaveLength(1);
        // No injectable session, no injectable store, no tenant in the input.
        expect(params, name).not.toMatch(/tenant|session|repo|store/i);
      }
      expect(source).not.toMatch(/tenantId|getSession|GetSession|ForSession/);
      expect(source).not.toMatch(/\brepo\b|Store\b|@\/auth/);
    },
  );

  it.each(opsFiles)(
    "%s is a plain module that is handed its tenant",
    (file) => {
      const source = code(read(file));
      expect(source).not.toContain('"use server"');
      expect(source).not.toMatch(/sessionTenant|requireTenant|@\/auth/);
      const functions = exportedFunctions(source);
      expect(functions.length).toBeGreaterThan(0);
      for (const { name, params } of functions) {
        expect(name).toMatch(/In$/);
        expect(params.trim(), name).toMatch(/^tenantId: string,/);
      }
    },
  );

  it("resolves the session in exactly one place", () => {
    const tenancy = code(read("lib/tenancy/index.ts"));
    expect(tenancy.match(/import\("@\/auth"\)/g)).toHaveLength(1);
    expect(tenancy).not.toContain("_client");
  });
});

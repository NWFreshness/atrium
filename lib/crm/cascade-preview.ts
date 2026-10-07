import type { CascadePreview } from "./queries-shared";

/**
 * The `Delete {name}` consequence line. Pure and client-importable: the only
 * import is a type, so `lib/client-boundary.test.ts` stays green.
 *
 * Non-zero nouns print in fixed order contacts → deals → activities, joined
 * with `", "` and `" and "` before the last; zero counts are omitted, and
 * all-zero yields the bare `Delete {name}?` byte-identical to the tables'
 * original string. The copy never says "cascade" or "orphan".
 */
export function pluralize(count: number, singular: string): string {
  if (count === 1) {
    return `1 ${singular}`;
  }
  if (singular === "activity") {
    return `${count} activities`;
  }
  return `${count} ${singular}s`;
}

export function consequenceMessage(
  name: string,
  preview: CascadePreview,
): string {
  const parts: string[] = [];
  if (preview.contacts > 0) {
    parts.push(pluralize(preview.contacts, "contact"));
  }
  if (preview.deals > 0) {
    parts.push(pluralize(preview.deals, "deal"));
  }
  if (preview.activities > 0) {
    parts.push(pluralize(preview.activities, "activity"));
  }
  if (parts.length === 0) {
    return `Delete ${name}?`;
  }
  const nouns =
    parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  return `Delete ${name}?\nThis will unlink ${nouns}.`;
}

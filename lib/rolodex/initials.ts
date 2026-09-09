const INITIAL_COLORS = [
  "#1f4e79",
  "#0f766e",
  "#854d0e",
  "#3f3f46",
  "#1e3a5f",
  "#166534",
  "#9a3412",
] as const;

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  const first = parts[0]![0] ?? "";
  const last = parts[parts.length - 1]![0] ?? "";
  return `${first}${last}`.toUpperCase();
}

export function colorFromName(name: string): string {
  let hash = 0;
  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return INITIAL_COLORS[hash % INITIAL_COLORS.length]!;
}

import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base: P = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

/** Bent-page document (pages, folders, inbox). */
export function DocIcon(props: P) {
  return (
    <svg {...base} {...props}>
      <path d="M6 3h9l3 3v15H6z" />
      <path d="M15 3v3h3" />
    </svg>
  );
}

/** Cylinder (database). */
export function DatabaseIcon(props: P) {
  return (
    <svg {...base} {...props}>
      <ellipse cx="12" cy="6" rx="7" ry="2.6" />
      <path d="M5 6v12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6" />
      <path d="M5 12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6" />
    </svg>
  );
}

/** Row node (a database row page). */
export function RowIcon(props: P) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="6" r="2.2" />
      <path d="M5 18c0-3.9 3.1-6 7-6s7 2.1 7 6" />
    </svg>
  );
}

export function SpaceGlyph({
  type,
  ...props
}: P & { type: "page" | "database" | "row" }) {
  if (type === "database") {
    return <DatabaseIcon {...props} />;
  }
  if (type === "row") {
    return <RowIcon {...props} />;
  }
  return <DocIcon {...props} />;
}
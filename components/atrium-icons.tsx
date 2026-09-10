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

export function HomeIcon(props: P) {
  return (
    <svg {...base} {...props}>
      <path d="M3 11.5 12 4l9 7.5M5.5 10v9h13v-9" />
    </svg>
  );
}

export function CrmIcon(props: P) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="5" width="14" height="14" rx="2" transform="rotate(45 12 12)" />
    </svg>
  );
}

export function SpaceIcon(props: P) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7c0-1.7 3.4-3 8-3s8 1.3 8 3-3.4 3-8 3-8-1.3-8-3Zm0 0v10c0 1.7 3.4 3 8 3s8-1.3 8-3V7" />
    </svg>
  );
}

export function RolodexIcon(props: P) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c1.3-3.5 3.9-5 7-5s5.7 1.5 7 5" />
    </svg>
  );
}

export function GrooveIcon(props: P) {
  return (
    <svg {...base} {...props}>
      <path d="M9 18V6l11-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </svg>
  );
}

export function RefreshIcon(props: P) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14m-6-6 6 6 6-6" />
    </svg>
  );
}

export function LogoutIcon(props: P) {
  return (
    <svg {...base} {...props}>
      <path d="M15 4h4v16h-4M10 17l-5-5 5-5M5 12h10" />
    </svg>
  );
}

export function ThemeIcon(props: P) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.5 5.5 7 7m10 10 1.5 1.5m0-13L17 7M7 17l-1.5 1.5" />
    </svg>
  );
}
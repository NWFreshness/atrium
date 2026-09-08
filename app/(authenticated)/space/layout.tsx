import type { ReactNode } from "react";
import { SpaceShell } from "@/components/space/space-shell";

export default function SpaceLayout({ children }: { children: ReactNode }) {
  return <SpaceShell>{children}</SpaceShell>;
}

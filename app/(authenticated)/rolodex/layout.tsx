import type { ReactNode } from "react";
import { RolodexSubnav } from "@/components/rolodex/rolodex-subnav";
import styles from "@/components/rolodex/rolodex-subnav.module.css";

export default function RolodexLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles["rolodex-shell"]}>
      <RolodexSubnav />
      {children}
    </div>
  );
}

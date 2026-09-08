import type { ReactNode } from "react";
import { CrmSubnav } from "@/components/crm/crm-subnav";
import styles from "@/components/crm/crm-subnav.module.css";

export default function CrmLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles["crm-shell"]}>
      <CrmSubnav />
      {children}
    </div>
  );
}

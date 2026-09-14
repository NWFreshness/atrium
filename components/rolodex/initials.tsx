import { initialsFromName } from "@/lib/rolodex/initials";
import styles from "./people.module.css";

export function Initials({
  name,
  large = false,
}: {
  name: string;
  large?: boolean;
}) {
  return (
    <span
      className={
        large
          ? `${styles["rolodex-initials"]} ${styles["rolodex-initials-lg"]}`
          : styles["rolodex-initials"]
      }
      aria-hidden="true"
    >
      {initialsFromName(name)}
    </span>
  );
}

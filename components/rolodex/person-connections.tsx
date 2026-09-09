"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CONNECTION_KINDS, type ConnectionKind } from "@/lib/rolodex/constants";
import {
  createConnectionAction,
  deleteConnectionAction,
} from "@/lib/rolodex/connection-actions";
import type { ConnectionView } from "@/lib/rolodex/connections";
import styles from "./people.module.css";

const KIND_LABEL: Record<ConnectionKind, string> = {
  partner: "Partner",
  parent_child: "Parent / child",
  sibling: "Sibling",
  colleague: "Colleague",
  other: "Other",
};

export function PersonConnections({
  personId,
  connections,
  people,
}: {
  personId: string;
  connections: ConnectionView[];
  people: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [kind, setKind] = useState<ConnectionKind>("partner");
  const others = people.filter((person) => person.id !== personId);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const otherId = String(data.get("otherId") || "");
    const selectedKind = String(data.get("kind")) as ConnectionKind;
    const note = String(data.get("note") || "").trim() || null;
    const label = String(data.get("label") || "").trim() || null;
    const inverseLabel = String(data.get("inverseLabel") || "").trim() || null;
    const aIsParent = String(data.get("aIsParent") || "") === "true";
    if (!otherId) {
      return;
    }
    setPending(true);
    try {
      await createConnectionAction({
        personA: personId,
        personB: otherId,
        kind: selectedKind,
        aIsParent: selectedKind === "parent_child" ? aIsParent : false,
        label,
        inverseLabel,
        note,
      });
      form.reset();
      setKind("partner");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <section>
      <h2>Connections</h2>
      {connections.length === 0 ? (
        <p className={styles["rolodex-empty"]}>No connections</p>
      ) : (
        <ul className={styles["rolodex-log-list"]}>
          {connections.map((row) => (
            <li key={row.id}>
              <Link href={`/rolodex/people/${row.otherId}`}>
                {row.description}
              </Link>
              <button
                type="button"
                aria-label={`Delete connection to ${row.otherName}`}
                onClick={async () => {
                  await deleteConnectionAction(row.id);
                  router.refresh();
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={onSubmit}>
        <label>
          Person
          <select name="otherId" required defaultValue="">
            <option value="" disabled>
              Choose someone
            </option>
            {others.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Kind
          <select
            name="kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as ConnectionKind)}
          >
            {CONNECTION_KINDS.map((row) => (
              <option key={row} value={row}>
                {KIND_LABEL[row]}
              </option>
            ))}
          </select>
        </label>
        {kind === "parent_child" ? (
          <label>
            This person is
            <select name="aIsParent" defaultValue="true">
              <option value="true">Parent of the other person</option>
              <option value="false">Child of the other person</option>
            </select>
          </label>
        ) : null}
        {kind === "other" ? (
          <>
            <label>
              Label
              <input name="label" />
            </label>
            <label>
              Inverse label
              <input name="inverseLabel" />
            </label>
          </>
        ) : null}
        <label>
          Note
          <input name="note" />
        </label>
        <button type="submit" disabled={pending || others.length === 0}>
          Add connection
        </button>
      </form>
    </section>
  );
}

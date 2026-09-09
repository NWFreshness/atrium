"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { GIFT_KINDS, type GiftKind } from "@/lib/rolodex/constants";
import { createGiftAction, deleteGiftAction } from "@/lib/rolodex/gift-actions";
import { giftIdeasToSurface } from "@/lib/rolodex/gifts";
import type { Gift, ImportantDate } from "@/lib/rolodex/queries";
import styles from "./people.module.css";

const KIND_LABEL: Record<GiftKind, string> = {
  idea: "Idea",
  given: "Given",
  received: "Received",
};

export function PersonGifts({
  personId,
  gifts,
  dates,
  today,
}: {
  personId: string;
  gifts: Gift[];
  dates: ImportantDate[];
  today: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const ideas = giftIdeasToSurface(gifts, dates, today);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const kind = String(data.get("kind")) as GiftKind;
    const occasion = String(data.get("occasion") || "").trim() || null;
    const date = String(data.get("date") || "").trim();
    if (!name || !date) {
      return;
    }
    setPending(true);
    try {
      await createGiftAction({ personId, name, kind, occasion, date });
      form.reset();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <section>
      <h2>Gifts</h2>
      {ideas.length > 0 ? (
        <p>
          Upcoming date — ideas: {ideas.map((idea) => idea.name).join(", ")}
        </p>
      ) : null}
      {gifts.length === 0 ? (
        <p className={styles["rolodex-empty"]}>No gifts</p>
      ) : (
        <ul className={styles["rolodex-log-list"]}>
          {gifts.map((row) => (
            <li key={row.id}>
              {KIND_LABEL[row.kind]} · {row.name}
              {row.occasion ? ` · ${row.occasion}` : ""} · {row.date}
              <button
                type="button"
                aria-label={`Delete gift ${row.name}`}
                onClick={async () => {
                  await deleteGiftAction(row.id);
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
          Name
          <input name="name" required />
        </label>
        <label>
          Kind
          <select name="kind" defaultValue="idea">
            {GIFT_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {KIND_LABEL[kind]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Occasion
          <input name="occasion" />
        </label>
        <label>
          Date
          <input name="date" type="date" required />
        </label>
        <button type="submit" disabled={pending}>
          Add gift
        </button>
      </form>
    </section>
  );
}

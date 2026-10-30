"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { consequenceMessage } from "@/lib/crm/cascade-preview";
import type { CascadePreview } from "@/lib/crm/queries";

/**
 * The delete flow every CRM list shares: ask the server what the delete would
 * unlink, say so in the confirm, and only then delete and refresh.
 */
export function useDeleteWithPreview(
  preview: (id: string) => Promise<CascadePreview>,
  remove: (id: string) => Promise<unknown>,
): (id: string, name: string) => Promise<void> {
  const router = useRouter();
  return useCallback(
    async (id, name) => {
      if (!confirm(consequenceMessage(name, await preview(id)))) {
        return;
      }
      await remove(id);
      router.refresh();
    },
    [preview, remove, router],
  );
}

"use server";

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { concepts } from "@/lib/db/schema";

// Called directly from the Mindscape client component (not a <form>) once
// its force simulation settles, so positions feel stable across visits
// instead of re-scrambling every time (plan section G).
export async function saveConceptLayoutAction(
  positions: { id: string; x: number; y: number }[],
) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    for (const p of positions) {
      await tx
        .update(concepts)
        .set({ layoutX: p.x, layoutY: p.y })
        .where(eq(concepts.id, p.id))
        .run();
    }
  });
}

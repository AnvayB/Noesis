import { revalidatePath as nextRevalidatePath } from "next/cache";

/** revalidatePath, tolerant of being called outside a request (scripts, tests). */
export function revalidatePath(path: string) {
  try {
    nextRevalidatePath(path);
  } catch {
    // Not in a Next request context; nothing to invalidate.
  }
}

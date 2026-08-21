import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  curriculumAttempts,
  curriculumLevelValues,
  type CurriculumAttempt,
  type CurriculumLevel,
  type CurriculumVerdict,
} from "@/lib/db/schema";
import { CURRICULUM_MODULES, type CurriculumModule, type CurriculumTrack } from "./index";

/** A module's own available levels, in canonical order: "understand" always
 * first, then whichever of explain/trace/modify/design it actually defines.
 * Tracks with no implementation to trace/modify (see
 * feedback_curriculum_track_levels) only define a subset. */
export function availableLevels(curriculumModule: CurriculumModule): CurriculumLevel[] {
  return curriculumLevelValues.filter(
    (level) => level === "understand" || level in curriculumModule.levels,
  );
}

// Kept separate from lib/queries.ts — curriculum is intentionally decoupled
// from the concepts/Mindscape domain (app self-knowledge vs. personal
// external learning), not joined against it in this version.

/** Most recent attempt per level, for one module. */
export async function getLatestAttempts(
  moduleSlug: string,
): Promise<Map<CurriculumLevel, CurriculumAttempt>> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(curriculumAttempts)
    .where(eq(curriculumAttempts.moduleSlug, moduleSlug))
    .orderBy(desc(curriculumAttempts.createdAt))
    .all();

  const latestByLevel = new Map<CurriculumLevel, CurriculumAttempt>();
  for (const row of rows) {
    if (!latestByLevel.has(row.level)) latestByLevel.set(row.level, row);
  }
  return latestByLevel;
}

export async function getAttemptHistory(
  moduleSlug: string,
  level: CurriculumLevel,
): Promise<CurriculumAttempt[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(curriculumAttempts)
    .where(eq(curriculumAttempts.moduleSlug, moduleSlug))
    .orderBy(desc(curriculumAttempts.createdAt))
    .all();
  return rows.filter((row) => row.level === level);
}

/** Highest level with at least one attempt, or null if the module hasn't
 * been started. Doesn't require a "solid" verdict — attempting a level is
 * enough to have "reached" it, consistent with the app's soft-gating,
 * no-scores philosophy. Only considers levels the module actually offers. */
export function furthestLevelReached(
  curriculumModule: CurriculumModule,
  latestByLevel: Map<CurriculumLevel, CurriculumAttempt>,
): CurriculumLevel | null {
  let furthest: CurriculumLevel | null = null;
  for (const level of availableLevels(curriculumModule)) {
    if (latestByLevel.has(level)) furthest = level;
  }
  return furthest;
}

/** The level to land on when opening a module fresh — one past the
 * furthest reached, or "understand" if nothing's been attempted yet. Stays
 * on the module's last available level once that's reached (e.g. "explain"
 * for an understanding-only track), rather than advancing past it. */
export function nextIncompleteLevel(
  curriculumModule: CurriculumModule,
  latestByLevel: Map<CurriculumLevel, CurriculumAttempt>,
): CurriculumLevel {
  const levels = availableLevels(curriculumModule);
  const furthest = furthestLevelReached(curriculumModule, latestByLevel);
  if (!furthest) return levels[0];
  const index = levels.indexOf(furthest);
  return levels[Math.min(index + 1, levels.length - 1)];
}

export interface ModuleProgressSummary {
  module: CurriculumModule;
  furthestLevel: CurriculumLevel | null;
  latestVerdict: CurriculumVerdict | null;
}

export async function listModuleProgressSummaries(
  track: CurriculumTrack,
): Promise<ModuleProgressSummary[]> {
  return Promise.all(
    CURRICULUM_MODULES.filter((module) => module.track === track).map(async (module) => {
      const latestByLevel = await getLatestAttempts(module.slug);
      const furthestLevel = furthestLevelReached(module, latestByLevel);
      const latestVerdict = furthestLevel
        ? (latestByLevel.get(furthestLevel)?.verdict ?? null)
        : null;
      return { module, furthestLevel, latestVerdict };
    }),
  );
}

import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  curriculumAttempts,
  curriculumLevelValues,
  type CurriculumAttempt,
  type CurriculumLevel,
  type CurriculumVerdict,
} from "@/lib/db/schema";
import { CURRICULUM_MODULES, type CurriculumModule } from "./index";

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
 * no-scores philosophy. */
export function furthestLevelReached(
  latestByLevel: Map<CurriculumLevel, CurriculumAttempt>,
): CurriculumLevel | null {
  let furthest: CurriculumLevel | null = null;
  for (const level of curriculumLevelValues) {
    if (latestByLevel.has(level)) furthest = level;
  }
  return furthest;
}

/** The level to land on when opening a module fresh — one past the
 * furthest reached, or "understand" if nothing's been attempted yet. */
export function nextIncompleteLevel(
  latestByLevel: Map<CurriculumLevel, CurriculumAttempt>,
): CurriculumLevel {
  const furthest = furthestLevelReached(latestByLevel);
  if (!furthest) return curriculumLevelValues[0];
  const index = curriculumLevelValues.indexOf(furthest);
  return curriculumLevelValues[Math.min(index + 1, curriculumLevelValues.length - 1)];
}

export interface ModuleProgressSummary {
  module: CurriculumModule;
  furthestLevel: CurriculumLevel | null;
  latestVerdict: CurriculumVerdict | null;
}

export async function listModuleProgressSummaries(): Promise<ModuleProgressSummary[]> {
  return Promise.all(
    CURRICULUM_MODULES.map(async (module) => {
      const latestByLevel = await getLatestAttempts(module.slug);
      const furthestLevel = furthestLevelReached(latestByLevel);
      const latestVerdict = furthestLevel
        ? (latestByLevel.get(furthestLevel)?.verdict ?? null)
        : null;
      return { module, furthestLevel, latestVerdict };
    }),
  );
}

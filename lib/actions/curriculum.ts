"use server";

import { redirect } from "next/navigation";
import { ai, type ArchitectureResponseLevel } from "@/lib/ai";
import { getDb } from "@/lib/db";
import { curriculumAttempts } from "@/lib/db/schema";
import { CURRICULUM_TRACKS, getCurriculumModule } from "@/lib/curriculum";

// Two actions, deliberately not one dispatching on level — "understand" has
// no AI call, and keeping it a separate function means it can never
// accidentally trigger one.

export async function markUnderstandCompleteAction(formData: FormData) {
  const moduleSlug = String(formData.get("moduleSlug") ?? "").trim();
  const curriculumModule = getCurriculumModule(moduleSlug);
  if (!curriculumModule) throw new Error("Curriculum module not found.");

  const db = await getDb();
  await db
    .insert(curriculumAttempts)
    .values({ moduleSlug, level: "understand" })
    .run();

  const basePath = CURRICULUM_TRACKS[curriculumModule.track].basePath;
  const firstGradeableLevel = Object.keys(curriculumModule.levels)[0] ?? "explain";
  redirect(`${basePath}/${moduleSlug}?level=${firstGradeableLevel}`);
}

export async function submitCurriculumResponseAction(formData: FormData) {
  const moduleSlug = String(formData.get("moduleSlug") ?? "").trim();
  const levelRaw = String(formData.get("level") ?? "").trim();
  const explanationText = String(formData.get("explanationText") ?? "").trim();

  const curriculumModule = getCurriculumModule(moduleSlug);
  if (!curriculumModule) throw new Error("Curriculum module not found.");

  // Validate against this module's own offered levels, not just the global
  // gradeable-level list — an understanding-only track (e.g. Arteris 101)
  // only offers "explain", even though "trace"/"modify"/"design" are valid
  // levels elsewhere.
  if (!(levelRaw in curriculumModule.levels)) {
    throw new Error("Invalid curriculum level for this module.");
  }
  const level = levelRaw as ArchitectureResponseLevel;

  if (!explanationText) throw new Error("A response is required.");

  const levelContent = curriculumModule.levels[level];
  if (!levelContent) throw new Error("Invalid curriculum level for this module.");

  // The one call that costs real money/latency in this flow — everything
  // else here is a local SQLite write, same as submitExplainBackAction.
  const analysis = await ai.analyzeArchitectureResponse({
    moduleTitle: curriculumModule.title,
    level,
    lessonSummary: curriculumModule.summary,
    groundTruth: levelContent.groundTruth,
    userResponse: explanationText,
  });

  const db = await getDb();
  await db
    .insert(curriculumAttempts)
    .values({
      moduleSlug,
      level,
      userResponse: explanationText,
      verdict: analysis.verdict,
      whatYouGotRight: analysis.whatYouGotRight,
      misconceptions: analysis.misconceptions,
      gaps: analysis.gaps,
      followUpQuestion: analysis.followUpQuestion,
    })
    .run();

  const basePath = CURRICULUM_TRACKS[curriculumModule.track].basePath;
  redirect(`${basePath}/${moduleSlug}?level=${level}`);
}

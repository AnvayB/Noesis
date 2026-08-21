"use server";

import { redirect } from "next/navigation";
import { ai, type ArchitectureResponseLevel } from "@/lib/ai";
import { getDb } from "@/lib/db";
import { curriculumAttempts } from "@/lib/db/schema";
import { getCurriculumModule } from "@/lib/curriculum";

const GRADEABLE_LEVELS: readonly ArchitectureResponseLevel[] = [
  "explain",
  "trace",
  "modify",
  "design",
];

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

  redirect(`/learn-noesis/${moduleSlug}?level=explain`);
}

export async function submitCurriculumResponseAction(formData: FormData) {
  const moduleSlug = String(formData.get("moduleSlug") ?? "").trim();
  const levelRaw = String(formData.get("level") ?? "").trim();
  const explanationText = String(formData.get("explanationText") ?? "").trim();

  const curriculumModule = getCurriculumModule(moduleSlug);
  if (!curriculumModule) throw new Error("Curriculum module not found.");

  if (!GRADEABLE_LEVELS.includes(levelRaw as ArchitectureResponseLevel)) {
    throw new Error("Invalid curriculum level.");
  }
  const level = levelRaw as ArchitectureResponseLevel;

  if (!explanationText) throw new Error("A response is required.");

  const levelContent = curriculumModule.levels[level];

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

  redirect(`/learn-noesis/${moduleSlug}?level=${level}`);
}

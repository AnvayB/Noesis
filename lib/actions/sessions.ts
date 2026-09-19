"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "@/lib/revalidate";
import { getDb } from "@/lib/db";
import {
  concepts,
  conceptUnderstandings,
  curiosityItems,
  explainBackConcepts,
  explainBackRelations,
  explainBacks,
  weeklyFocus,
  learningSessions,
  resourceTypeValues,
  resources,
  sessionConcepts,
  type ActivityMode,
  type EnvironmentMode,
  type ResourceType,
} from "@/lib/db/schema";
import { findOrCreateConcept } from "@/lib/concepts";
import { asUrl } from "@/lib/capture";
import { createSession, describeLink, suggestConcept, type ResourceInput } from "@/lib/actions/capture";

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

/**
 * The detailed form: for logging a session with everything known about it,
 * or for keeping one for later with notes. Only title matters; the concept
 * is suggested when left blank, and a link is read for its text.
 */
export async function createSessionAction(formData: FormData) {
  const title = field(formData, "title");
  const topicRaw = field(formData, "topic");
  const environmentModeRaw = field(formData, "environmentMode");
  const activityModeRaw = field(formData, "activityMode");
  const environmentMode: EnvironmentMode = environmentModeRaw === "listen" ? "listen" : "focus";
  const activityMode: ActivityMode = activityModeRaw === "practice" ? "practice" : "consume";
  const notes = field(formData, "notes") || null;
  const durationRaw = field(formData, "durationMinutes");
  const durationMinutes = durationRaw ? Number(durationRaw) : null;
  const resourceTypeRaw = field(formData, "resourceType");
  const resourceUrlRaw = field(formData, "resourceUrl");
  const resourceTitle = field(formData, "resourceTitle");
  const curiosityItemId = field(formData, "curiosityItemId") || null;
  const status = field(formData, "status") === "pending" ? "pending" : "started";

  if (!title) throw new Error("A title is required.");

  const url = resourceUrlRaw ? asUrl(resourceUrlRaw) : null;
  let resource: ResourceInput | null = null;
  if (url) {
    resource = await describeLink(url);
    if (resourceTitle) resource.title = resourceTitle;
    if (resourceTypeRaw && resourceTypeValues.includes(resourceTypeRaw as ResourceType)) {
      resource.type = resourceTypeRaw as ResourceType;
    }
  } else if (resourceTitle) {
    resource = {
      type:
        resourceTypeRaw && resourceTypeValues.includes(resourceTypeRaw as ResourceType)
          ? (resourceTypeRaw as ResourceType)
          : "other",
      url: null,
      title: resourceTitle,
    };
  }

  const suggestion = topicRaw ? null : await suggestConcept(title);
  const topic = topicRaw || suggestion?.topic || title;
  const fieldName = field(formData, "field") || suggestion?.field || null;

  const sessionId = await createSession({
    title,
    topic,
    field: fieldName,
    status,
    resource,
    curiosityItemId,
    environmentMode,
    activityMode,
    durationMinutes: Number.isFinite(durationMinutes) ? durationMinutes : null,
    notes,
  });

  redirect(status === "pending" ? "/learn" : `/sessions/${sessionId}`);
}

export async function updateSessionAction(formData: FormData) {
  const sessionId = field(formData, "sessionId");
  const title = field(formData, "title");
  const topic = field(formData, "topic");
  const environmentMode = field(formData, "environmentMode") as EnvironmentMode;
  const activityMode = field(formData, "activityMode") as ActivityMode;
  const notes = field(formData, "notes") || null;
  const durationRaw = field(formData, "durationMinutes");
  const durationMinutes = durationRaw ? Number(durationRaw) : null;
  const resourceType = field(formData, "resourceType");
  const resourceUrl = field(formData, "resourceUrl");
  const resourceTitle = field(formData, "resourceTitle");
  const existingResourceId = field(formData, "resourceId") || null;
  const fieldName = field(formData, "field") || null;

  if (!sessionId || !title || !topic) {
    throw new Error("Session id, title, and concept are required.");
  }
  if (environmentMode !== "listen" && environmentMode !== "focus") {
    throw new Error("Invalid environment mode.");
  }
  if (activityMode !== "consume" && activityMode !== "practice") {
    throw new Error("Invalid activity mode.");
  }

  const db = await getDb();

  const existing = await db
    .select({ endedAt: learningSessions.endedAt, status: learningSessions.status })
    .from(learningSessions)
    .where(eq(learningSessions.id, sessionId))
    .get();
  if (!existing) throw new Error("Session not found.");
  const status = existing.status;

  const existingConcept = await db
    .select({ conceptId: sessionConcepts.conceptId })
    .from(sessionConcepts)
    .where(
      and(
        eq(sessionConcepts.sessionId, sessionId),
        eq(sessionConcepts.role, "primary"),
      ),
    )
    .get();

  let resourceId = existingResourceId;
  if (
    resourceType &&
    resourceTypeValues.includes(resourceType as (typeof resourceTypeValues)[number]) &&
    (resourceUrl || resourceTitle)
  ) {
    if (resourceId) {
      await db
        .update(resources)
        .set({
          type: resourceType as (typeof resourceTypeValues)[number],
          url: resourceUrl || null,
          title: resourceTitle || resourceUrl,
        })
        .where(eq(resources.id, resourceId))
        .run();
    } else {
      resourceId = crypto.randomUUID();
      await db
        .insert(resources)
        .values({
          id: resourceId,
          type: resourceType as (typeof resourceTypeValues)[number],
          url: resourceUrl || null,
          title: resourceTitle || resourceUrl,
        })
        .run();
    }
  }

  await db
    .update(learningSessions)
    .set({
      title,
      environmentMode,
      activityMode,
      status,
      durationMinutes,
      notes,
      resourceId,
    })
    .where(eq(learningSessions.id, sessionId))
    .run();

  // Keep endedAt in sync with status: set it the first time a session
  // becomes completed, clear it if it's moved back out of completed.
  if (status === "completed" && !existing.endedAt) {
    await db
      .update(learningSessions)
      .set({ endedAt: sql`(current_timestamp)` })
      .where(eq(learningSessions.id, sessionId))
      .run();
  } else if (status !== "completed" && existing.endedAt) {
    await db
      .update(learningSessions)
      .set({ endedAt: null })
      .where(eq(learningSessions.id, sessionId))
      .run();
  }

  const concept = await findOrCreateConcept(topic, fieldName);
  if (fieldName) {
    await db.update(concepts).set({ field: fieldName }).where(eq(concepts.id, concept.id)).run();
  }
  if (concept.id !== existingConcept?.conceptId) {
    await db
      .delete(sessionConcepts)
      .where(
        and(
          eq(sessionConcepts.sessionId, sessionId),
          eq(sessionConcepts.role, "primary"),
        ),
      )
      .run();
    await db
      .insert(sessionConcepts)
      .values({ sessionId, conceptId: concept.id, role: "primary" })
      .run();
  }

  redirect(`/sessions/${sessionId}`);
}

export async function startSessionAction(formData: FormData) {
  const sessionId = field(formData, "sessionId");
  if (!sessionId) throw new Error("Session id is required.");

  const db = await getDb();
  await db
    .update(learningSessions)
    .set({ status: "started", startedAt: sql`(current_timestamp)` })
    .where(eq(learningSessions.id, sessionId))
    .run();

  revalidatePath("/");
  revalidatePath("/learn");
  redirect(`/sessions/${sessionId}`);
}

/** Put a started session back among the things kept for later. Nothing is lost. */
export async function setAsideSessionAction(formData: FormData) {
  const sessionId = field(formData, "sessionId");
  if (!sessionId) throw new Error("Session id is required.");

  const db = await getDb();
  await db
    .update(learningSessions)
    .set({ status: "pending" })
    .where(eq(learningSessions.id, sessionId))
    .run();

  revalidatePath("/");
  revalidatePath("/learn");
  revalidatePath("/sessions");
}

// FK "cascade"/"set null" in the schema are declarative only — libSQL, like
// SQLite, defaults foreign key enforcement off per connection, and nothing
// in lib/db/index.ts turns it on — so a plain delete on learningSessions
// would leave orphaned explain_backs/session_concepts rows behind. Delete
// the dependent rows explicitly, in dependency order, instead.
export async function deleteSessionAction(formData: FormData) {
  const sessionId = field(formData, "sessionId");
  if (!sessionId) throw new Error("Session id is required.");

  const db = await getDb();

  const backs = await db
    .select({ id: explainBacks.id })
    .from(explainBacks)
    .where(eq(explainBacks.sessionId, sessionId))
    .all();
  const explainBackIds = backs.map((b) => b.id);

  if (explainBackIds.length > 0) {
    await db
      .delete(conceptUnderstandings)
      .where(inArray(conceptUnderstandings.explainBackId, explainBackIds))
      .run();
    await db
      .delete(explainBackConcepts)
      .where(inArray(explainBackConcepts.explainBackId, explainBackIds))
      .run();
    await db
      .delete(explainBackRelations)
      .where(inArray(explainBackRelations.explainBackId, explainBackIds))
      .run();
  }
  await db.delete(weeklyFocus).where(eq(weeklyFocus.sessionId, sessionId)).run();

  await db.delete(explainBacks).where(eq(explainBacks.sessionId, sessionId)).run();
  await db.delete(sessionConcepts).where(eq(sessionConcepts.sessionId, sessionId)).run();
  await db
    .update(curiosityItems)
    .set({ promotedToSessionId: null })
    .where(eq(curiosityItems.promotedToSessionId, sessionId))
    .run();
  await db.delete(learningSessions).where(eq(learningSessions.id, sessionId)).run();

  revalidatePath("/");
  revalidatePath("/learn");
  revalidatePath("/sessions");
}

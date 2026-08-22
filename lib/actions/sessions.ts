"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import {
  conceptUnderstandings,
  curiosityItems,
  explainBackConcepts,
  explainBacks,
  learningSessionStatusValues,
  learningSessions,
  resourceTypeValues,
  resources,
  sessionConcepts,
  type ActivityMode,
  type EnvironmentMode,
} from "@/lib/db/schema";
import { findOrCreateConcept } from "@/lib/concepts";

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

export async function createSessionAction(formData: FormData) {
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
  const curiosityItemId = field(formData, "curiosityItemId") || null;
  const statusRaw = field(formData, "status");
  const status = learningSessionStatusValues.includes(
    statusRaw as (typeof learningSessionStatusValues)[number],
  )
    ? (statusRaw as (typeof learningSessionStatusValues)[number])
    : "started";

  if (!title || !topic) {
    throw new Error("Title and topic are required.");
  }
  if (environmentMode !== "listen" && environmentMode !== "focus") {
    throw new Error("Invalid environment mode.");
  }
  if (activityMode !== "consume" && activityMode !== "practice") {
    throw new Error("Invalid activity mode.");
  }

  const db = await getDb();

  let resourceId: string | null = null;
  if (
    resourceType &&
    resourceTypeValues.includes(resourceType as (typeof resourceTypeValues)[number]) &&
    (resourceUrl || resourceTitle)
  ) {
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

  const concept = await findOrCreateConcept(topic);

  const sessionId = crypto.randomUUID();
  await db
    .insert(learningSessions)
    .values({
      id: sessionId,
      title,
      resourceId,
      environmentMode,
      activityMode,
      status,
      durationMinutes,
      notes,
    })
    .run();

  await db
    .insert(sessionConcepts)
    .values({ sessionId, conceptId: concept.id, role: "primary" })
    .run();

  if (curiosityItemId) {
    await db
      .update(curiosityItems)
      .set({
        resolvedAt: sql`(current_timestamp)`,
        promotedToSessionId: sessionId,
      })
      .where(eq(curiosityItems.id, curiosityItemId))
      .run();
  }

  redirect(status === "pending" ? "/sessions?status=pending" : `/sessions/${sessionId}`);
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
  const statusRaw = field(formData, "status");
  const status = learningSessionStatusValues.includes(
    statusRaw as (typeof learningSessionStatusValues)[number],
  )
    ? (statusRaw as (typeof learningSessionStatusValues)[number])
    : undefined;

  if (!sessionId || !title || !topic || !status) {
    throw new Error("Session id, title, topic, and status are required.");
  }
  if (environmentMode !== "listen" && environmentMode !== "focus") {
    throw new Error("Invalid environment mode.");
  }
  if (activityMode !== "consume" && activityMode !== "practice") {
    throw new Error("Invalid activity mode.");
  }

  const db = await getDb();

  const existing = await db
    .select({ endedAt: learningSessions.endedAt })
    .from(learningSessions)
    .where(eq(learningSessions.id, sessionId))
    .get();
  if (!existing) throw new Error("Session not found.");

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

  const concept = await findOrCreateConcept(topic);
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
    .set({ status: "started" })
    .where(eq(learningSessions.id, sessionId))
    .run();

  redirect(`/sessions/${sessionId}`);
}

export async function completeSessionAction(formData: FormData) {
  const sessionId = field(formData, "sessionId");
  if (!sessionId) throw new Error("Session id is required.");

  const db = await getDb();
  await db
    .update(learningSessions)
    .set({ status: "completed", endedAt: sql`(current_timestamp)` })
    .where(eq(learningSessions.id, sessionId))
    .run();

  redirect(`/sessions/${sessionId}`);
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
  }

  await db.delete(explainBacks).where(eq(explainBacks.sessionId, sessionId)).run();
  await db.delete(sessionConcepts).where(eq(sessionConcepts.sessionId, sessionId)).run();
  await db
    .update(curiosityItems)
    .set({ promotedToSessionId: null })
    .where(eq(curiosityItems.promotedToSessionId, sessionId))
    .run();
  await db.delete(learningSessions).where(eq(learningSessions.id, sessionId)).run();

  revalidatePath("/");
  revalidatePath("/sessions");
}

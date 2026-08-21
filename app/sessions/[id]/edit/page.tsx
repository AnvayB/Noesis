import Link from "next/link";
import { notFound } from "next/navigation";
import { NavHeader } from "@/components/NavHeader";
import { updateSessionAction } from "@/lib/actions/sessions";
import {
  learningSessionStatusValues,
  resourceTypeValues,
  resourceTypeLabels,
} from "@/lib/db/schema";
import { getSessionById } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function EditSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionById(id);
  if (!session) notFound();

  return (
    <div className="flex flex-1 flex-col bg-background font-sans">
      <NavHeader active="Learn" />

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-8 py-12">
        <h1 className="text-lg font-medium text-zinc-800 dark:text-zinc-100">
          Edit session
        </h1>

        <form action={updateSessionAction} className="flex flex-col gap-6">
          <input type="hidden" name="sessionId" value={session.id} />
          {session.resourceId && (
            <input type="hidden" name="resourceId" value={session.resourceId} />
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Title</span>
            <input
              name="title"
              required
              defaultValue={session.title}
              className="rounded-lg border border-black/[.08] bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-zinc-400 dark:border-white/[.1] dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Topic</span>
            <input
              name="topic"
              required
              defaultValue={session.conceptName ?? ""}
              className="rounded-lg border border-black/[.08] bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-zinc-400 dark:border-white/[.1] dark:bg-zinc-950 dark:text-zinc-100"
            />
            <span className="text-xs text-zinc-400 dark:text-zinc-600">
              Links this session to a concept in your knowledge landscape.
            </span>
          </label>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-sm text-zinc-500 dark:text-zinc-400">
              Status
            </legend>
            <div className="flex gap-4 text-sm text-zinc-700 dark:text-zinc-300">
              {learningSessionStatusValues.map((value) => (
                <label key={value} className="flex items-center gap-1.5 capitalize">
                  <input
                    type="radio"
                    name="status"
                    value={value}
                    defaultChecked={session.status === value}
                  />
                  {value}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-sm text-zinc-500 dark:text-zinc-400">
              Environment
            </legend>
            <div className="flex gap-4 text-sm text-zinc-700 dark:text-zinc-300">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="environmentMode"
                  value="listen"
                  defaultChecked={session.environmentMode === "listen"}
                />
                Listen
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="environmentMode"
                  value="focus"
                  defaultChecked={session.environmentMode === "focus"}
                />
                Focus
              </label>
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-sm text-zinc-500 dark:text-zinc-400">
              Activity
            </legend>
            <div className="flex gap-4 text-sm text-zinc-700 dark:text-zinc-300">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="activityMode"
                  value="consume"
                  defaultChecked={session.activityMode === "consume"}
                />
                Consume
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="activityMode"
                  value="practice"
                  defaultChecked={session.activityMode === "practice"}
                />
                Practice
              </label>
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                Resource type
              </span>
              <select
                name="resourceType"
                defaultValue={session.resourceType ?? ""}
                className="rounded-lg border border-black/[.08] bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-zinc-400 dark:border-white/[.1] dark:bg-zinc-950 dark:text-zinc-100"
              >
                <option value="">None</option>
                {resourceTypeValues.map((type) => (
                  <option key={type} value={type}>
                    {resourceTypeLabels[type]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                Duration (min)
              </span>
              <input
                name="durationMinutes"
                type="number"
                min={0}
                defaultValue={session.durationMinutes ?? ""}
                placeholder="optional"
                className="rounded-lg border border-black/[.08] bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-zinc-400 dark:border-white/[.1] dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Resource URL or title
            </span>
            <input
              name="resourceUrl"
              defaultValue={session.resourceUrl ?? ""}
              placeholder="https:// (optional)"
              className="rounded-lg border border-black/[.08] bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-zinc-400 dark:border-white/[.1] dark:bg-zinc-950 dark:text-zinc-100"
            />
            <input
              name="resourceTitle"
              defaultValue={session.resourceTitle ?? ""}
              placeholder="Title (optional, defaults to URL)"
              className="rounded-lg border border-black/[.08] bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-zinc-400 dark:border-white/[.1] dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Notes</span>
            <textarea
              name="notes"
              rows={3}
              defaultValue={session.notes ?? ""}
              placeholder="optional"
              className="rounded-lg border border-black/[.08] bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-zinc-400 dark:border-white/[.1] dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Save changes
            </button>
            <Link
              href={`/sessions/${session.id}`}
              className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}

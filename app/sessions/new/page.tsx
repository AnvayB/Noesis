import Link from "next/link";
import { NavHeader } from "@/components/NavHeader";
import { SessionTitleTopicFields } from "@/components/SessionTitleTopicFields";
import { createSessionAction } from "@/lib/actions/sessions";
import { resourceTypeValues, resourceTypeLabels } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function NewSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ curiosityItemId?: string; topic?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex flex-1 flex-col bg-background font-sans">
      <NavHeader active="Learn" />

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-8 py-12">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-medium text-zinc-800 dark:text-zinc-100">
            Add learning material
          </h1>
          <p className="text-sm text-zinc-400 dark:text-zinc-600">
            Save it to your backlog now and start it later, or start right
            away.
          </p>
        </div>

        <form action={createSessionAction} className="flex flex-col gap-6">
          {params.curiosityItemId && (
            <input
              type="hidden"
              name="curiosityItemId"
              value={params.curiosityItemId}
            />
          )}

          <SessionTitleTopicFields defaultTopic={params.topic ?? ""} />

          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-sm text-zinc-500 dark:text-zinc-400">
              Environment
            </legend>
            <div className="flex gap-4 text-sm text-zinc-700 dark:text-zinc-300">
              <label className="flex items-center gap-1.5">
                <input type="radio" name="environmentMode" value="listen" />
                Listen
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="environmentMode"
                  value="focus"
                  defaultChecked
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
                  defaultChecked
                />
                Consume
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" name="activityMode" value="practice" />
                Practice
              </label>
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                Resource type
              </span>
              <select
                name="resourceType"
                defaultValue=""
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
              placeholder="https:// (optional)"
              className="rounded-lg border border-black/[.08] bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-zinc-400 dark:border-white/[.1] dark:bg-zinc-950 dark:text-zinc-100"
            />
            <input
              name="resourceTitle"
              placeholder="Title (optional, defaults to URL)"
              className="rounded-lg border border-black/[.08] bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-zinc-400 dark:border-white/[.1] dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Notes</span>
            <textarea
              name="notes"
              rows={3}
              placeholder="optional"
              className="rounded-lg border border-black/[.08] bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-zinc-400 dark:border-white/[.1] dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              name="status"
              value="pending"
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Add to backlog
            </button>
            <button
              type="submit"
              name="status"
              value="started"
              className="rounded-full bg-black/[.06] px-5 py-2 text-sm font-medium text-zinc-700 dark:bg-white/[.08] dark:text-zinc-200"
            >
              Start now
            </button>
            <Link
              href="/"
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

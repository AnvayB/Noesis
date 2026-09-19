import Link from "next/link";
import { notFound } from "next/navigation";
import { NavHeader } from "@/components/NavHeader";
import { updateSessionAction } from "@/lib/actions/sessions";
import { resourceTypeValues, resourceTypeLabels } from "@/lib/db/schema";
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
    <div className="flex flex-1 flex-col">
      <NavHeader active="Learn" />

      <main className="page-enter mx-auto flex w-full max-w-xl flex-1 flex-col gap-10 px-6 py-14 sm:px-10">
        <div className="flex flex-col gap-2">
          <p className="meta">Editing</p>
          <h1 className="title text-[34px]">{session.title}</h1>
        </div>

        <form action={updateSessionAction} className="flex flex-col gap-9">
          <input type="hidden" name="sessionId" value={session.id} />
          {session.resourceId && (
            <input type="hidden" name="resourceId" value={session.resourceId} />
          )}

          <div className="flex flex-col gap-6">
            <label className="flex flex-col gap-1">
              <span className="meta">Title</span>
              <input
                name="title"
                required
                defaultValue={session.title}
                className="field font-serif text-[22px] leading-snug"
              />
            </label>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="meta">Concept it belongs to</span>
                <input
                  name="topic"
                  required
                  defaultValue={session.conceptName ?? ""}
                  className="field"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="meta">Field</span>
                <input
                  name="field"
                  defaultValue={session.conceptField ?? ""}
                  placeholder="Machine learning, Baking…"
                  className="field"
                />
              </label>
            </div>
            <p className="meta -mt-3">The concept is where this lands on your map; the field is the region it grows in.</p>

          </div>

          <div className="flex flex-col gap-6 border-t border-rule pt-8">
            <p className="meta">Where it comes from.</p>
            <label className="flex flex-col gap-1">
              <span className="meta">Link</span>
              <input
                name="resourceUrl"
                defaultValue={session.resourceUrl ?? ""}
                placeholder="https://"
                className="field"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="meta">Name of the source</span>
              <input
                name="resourceTitle"
                defaultValue={session.resourceTitle ?? ""}
                placeholder="If the link doesn't say it"
                className="field"
              />
            </label>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="meta">Kind of source</span>
                <select
                  name="resourceType"
                  defaultValue={session.resourceType ?? ""}
                  className="field"
                >
                  <option value="">Not sure</option>
                  {resourceTypeValues.map((type) => (
                    <option key={type} value={type}>
                      {resourceTypeLabels[type]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="meta">Minutes</span>
                <input
                  name="durationMinutes"
                  type="number"
                  min={0}
                  defaultValue={session.durationMinutes ?? ""}
                  className="field"
                />
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-6 border-t border-rule pt-8">
            <p className="meta">How you took it in.</p>
            <fieldset className="flex flex-col gap-2">
              <legend className="meta mb-2">Attention</legend>
              <div className="flex flex-wrap gap-6 text-[15px]">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="environmentMode"
                    value="focus"
                    defaultChecked={session.environmentMode === "focus"}
                    className="radio"
                  />
                  Focused
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="environmentMode"
                    value="listen"
                    defaultChecked={session.environmentMode === "listen"}
                    className="radio"
                  />
                  Listening while doing something else
                </label>
              </div>
            </fieldset>
            <fieldset className="flex flex-col gap-2">
              <legend className="meta mb-2">Doing</legend>
              <div className="flex flex-wrap gap-6 text-[15px]">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="activityMode"
                    value="consume"
                    defaultChecked={session.activityMode === "consume"}
                    className="radio"
                  />
                  Taking it in
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="activityMode"
                    value="practice"
                    defaultChecked={session.activityMode === "practice"}
                    className="radio"
                  />
                  Practising it
                </label>
              </div>
            </fieldset>
            <label className="flex flex-col gap-1">
              <span className="meta">Anything to remember</span>
              <textarea
                name="notes"
                rows={3}
                defaultValue={session.notes ?? ""}
                className="field"
              />
            </label>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" className="btn btn-ink">
              Save changes
            </button>
            <Link href={`/sessions/${session.id}`} className="btn-quiet btn text-sm">
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}

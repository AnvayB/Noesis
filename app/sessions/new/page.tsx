import Link from "next/link";
import { LearnNav } from "@/components/LearnNav";
import { NavHeader } from "@/components/NavHeader";
import { NewSessionSubmitButtons } from "@/components/NewSessionSubmitButtons";
import { SessionTitleTopicFields } from "@/components/SessionTitleTopicFields";
import { createSessionAction } from "@/lib/actions/sessions";
import { resourceTypeValues, resourceTypeLabels } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function NewSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ curiosityItemId?: string; topic?: string; title?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex flex-1 flex-col">
      <NavHeader active="Learn" />

      <main className="page-enter mx-auto flex w-full max-w-xl flex-1 flex-col gap-10 px-6 py-12 sm:px-10 sm:py-14">
        <div className="flex flex-col gap-5">
          <h1 className="title text-[40px]">Add with details</h1>
          <LearnNav active="Add with details" />
          <p className="meta">
            For logging a session with everything you know about it, or keeping one for later with
            notes. Only the title is required; a link is read for its text.
          </p>
        </div>

        <form action={createSessionAction} className="flex flex-col gap-9">
          {params.curiosityItemId && (
            <input type="hidden" name="curiosityItemId" value={params.curiosityItemId} />
          )}

          <div className="flex flex-col gap-6">
            <SessionTitleTopicFields defaultTitle={params.title ?? ""} defaultTopic={params.topic ?? ""} />
          </div>

          <div className="flex flex-col gap-6 border-t border-rule pt-8">
            <p className="meta">Where it comes from, if there is a source.</p>

            <label className="flex flex-col gap-1">
              <span className="meta">Link</span>
              <input name="resourceUrl" placeholder="https://" className="field" autoComplete="off" />
            </label>

            <label className="flex flex-col gap-1">
              <span className="meta">Name of the source</span>
              <input
                name="resourceTitle"
                placeholder="If the link doesn't say it"
                className="field"
                autoComplete="off"
              />
            </label>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="meta">Kind of source</span>
                <select name="resourceType" defaultValue="" className="field">
                  <option value="">Not sure yet</option>
                  {resourceTypeValues.map((type) => (
                    <option key={type} value={type}>
                      {resourceTypeLabels[type]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="meta">Minutes, if you know</span>
                <input name="durationMinutes" type="number" min={0} className="field" />
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-6 border-t border-rule pt-8">
            <p className="meta">How you will take it in.</p>

            <fieldset className="flex flex-col gap-2">
              <legend className="meta mb-2">Attention</legend>
              <div className="flex flex-wrap gap-6 text-[15px]">
                <label className="flex items-center gap-2">
                  <input type="radio" name="environmentMode" value="focus" defaultChecked className="radio" />
                  Focused
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="environmentMode" value="listen" className="radio" />
                  Listening while doing something else
                </label>
              </div>
            </fieldset>

            <fieldset className="flex flex-col gap-2">
              <legend className="meta mb-2">Doing</legend>
              <div className="flex flex-wrap gap-6 text-[15px]">
                <label className="flex items-center gap-2">
                  <input type="radio" name="activityMode" value="consume" defaultChecked className="radio" />
                  Taking it in
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="activityMode" value="practice" className="radio" />
                  Practising it
                </label>
              </div>
            </fieldset>

            <label className="flex flex-col gap-1">
              <span className="meta">Anything to remember</span>
              <textarea name="notes" rows={2} className="field" />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <NewSessionSubmitButtons />
            <Link href="/learn" className="btn-quiet btn text-sm">
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}

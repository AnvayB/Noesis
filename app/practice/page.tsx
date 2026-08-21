import { NavHeader } from "@/components/NavHeader";
import { SpeakingPromptGenerator } from "@/components/SpeakingPromptGenerator";

// Spec section 14: unprompted.cool integration stays a plain external link —
// "our personalized speaking prompts are ultimately more important because
// the system understands my knowledge history," so that's where the real
// effort goes (SpeakingPromptGenerator), not a deep unprompted.cool embed.
export default function PracticePage() {
  return (
    <div className="flex flex-1 flex-col bg-background font-sans">
      <NavHeader active="Practice" />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-8 py-12">
        <h1 className="text-lg font-medium text-zinc-800 dark:text-zinc-100">
          Practice Speaking
        </h1>

        <section className="flex flex-col gap-3 rounded-2xl border border-black/[.06] bg-white p-6 dark:border-white/[.08] dark:bg-zinc-950">
          <div>
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              From My Knowledge
            </h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-600">
              A speaking prompt based on something you&apos;ve learned.
            </p>
          </div>
          <SpeakingPromptGenerator />
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-black/[.06] bg-white p-6 dark:border-white/[.08] dark:bg-zinc-950">
          <div>
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Random Topic
            </h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-600">
              Practice spontaneous speaking on anything.
            </p>
          </div>
          <a
            href="https://unprompted.cool"
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit rounded-full bg-black/[.06] px-4 py-2 text-sm text-zinc-700 dark:bg-white/[.08] dark:text-zinc-200"
          >
            Open unprompted.cool
          </a>
        </section>
      </main>
    </div>
  );
}

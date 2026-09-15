# Noesis usability audit and target UX

A heuristic evaluation of the running application, walked screen by screen
with a seeded twelve-row learning history, followed by a proposed
information architecture. The current navigation and page structure are
treated as prototype decisions. Visual styling is discussed last and only
briefly, because most of the "flat, drab, dashboard modules" impression
turns out to be an information-architecture problem wearing a styling
problem's clothes.

Method: Krug's laws and Nielsen's ten heuristics, severity 0 to 4, plus two
cognitive walkthroughs of the journeys the earlier product analyses said
matter most: discovering something and beginning to learn it, and returning
to unfinished learning.

## Score: 4 out of 10

Seven of the ten Quick Diagnostic rows fail. There is no catastrophic issue,
but there are five major ones, and they cluster on the two journeys that
decide whether the app gets used.

| Diagnostic row | Result | Worst issue behind it |
|---|---|---|
| Can I tell what site and page this is? | Fail | "Learn" in the nav opens a page titled "Session history". Concept pages have no active nav item. |
| Is the main action obvious? | Fail | Home has six equal modules and no primary action. The one form's primary button is "Add to backlog". |
| Is the navigation clear? | Fail | Six top-level items, two of which are content tracks, not app sections. |
| Can I find search? | Fail | None. Minor for a personal app, but the session list is already six rows of filters. |
| Does the system show what is happening? | Fail | Submitting an explanation runs a multi-second model call with no visible state. |
| Are error messages helpful? | Not observed | No error surface was reachable without a live model key. |
| Can users undo or go back? | Partial | Delete is a browser confirm dialog. Cancel links exist. |
| Does it work without hover? | Pass | |
| Are interactive elements labeled? | Pass | Icon buttons carry aria-labels and titles. |
| Does anything make me stop and think? | Fail | Environment and Activity radios before learning. "Dismiss" that actually resolves. "Promote". "Mark as completed without explaining". Duplicate rows. |

## Findings by severity

### Severity 3, major

**1. Sessions with several concepts appear once per concept.** A completed
session tagged with three concepts shows three times in Recent sessions and
three times in Session history, each row carrying a different concept chip.
The query joins `session_concepts` without restricting to the primary role
(`lib/queries.ts:62` and `lib/queries.ts:110`). This is the first thing a
user sees after their first real explanation, and it makes the product look
broken exactly when it should look rewarding.

**2. The primary action on the only creation form is deferral.** On "Add
learning material", "Add to backlog" is the dark primary button and "Start
now" is the grey secondary one. The visual hierarchy tells the user the
expected thing to do is to save it for later. The Jobs-to-be-Done analysis
identified bookmarking as the guilt-deferral behavior Noesis exists to
displace, and the form's own emphasis recommends it.

**3. Beginning to learn costs eight fields and two classification decisions.**
Title, Topic (required, model-suggested after a blur), Environment, Activity,
Resource type, Duration, URL, a second Title, Notes, then a choice of two
submit buttons. Duration cannot be known before learning. Environment and
Activity are facts about how the learning will happen, asked before it has.
The topic suggestion only fires after the title field loses focus, so a user
who tabs straight to Topic sees a required empty field.

**4. There is no path back to unfinished learning.** A session that was
started but never explained is the most important object in the app, and it
has no home. On the Home page it appears in "Recent sessions" with a small
"Started" chip and no call to action. The backlog, which is the less urgent
list, gets a section of its own with a Start button on every row. Returning
to unfinished learning means: Home, scan Recent, notice a chip, click, scroll
to the explanation box. Nothing on any screen says "continue".

**5. Submitting an explanation gives no feedback during grading.** The
submit button is a plain form button with no pending state, and the model
call takes seconds. Nothing in `ExplainBackInput.tsx` or the session page
uses a form status. The user's most effortful action ends in silence, and a
second click would submit twice.

**6. The Home page does not say what Noesis is.** It opens with a bordered
box labelled "Mindscape" containing a small force-directed graph, then
Backlog, then Quick one, then Recent sessions beside Curiosity inbox, then an
"Export database backup" link. Every module has the same weight, the same
card, the same small grey heading. A newcomer cannot tell whether this is a
reading list, a quiz app, or a graph tool, and the creator's own reaction,
"a collection of dashboard modules", is the accurate reading.

### Severity 2, minor

**7. Navigation labels fail the trunk test.** "Learn" opens "Session
history". "Home" is the only page where the Mindscape is above the fold, but
"Mindscape" is also a nav item leading to a page that is the same component
taller. Two curriculum tracks, "Learn Noesis" and "Arteris 101", sit as
peers of Learn and Practice; they are content, not structure, and they will
multiply. The concept detail page renders the header with no active item,
so orientation is lost on the page that should feel most like the map.

**8. Repeated functionality.** The Mindscape page duplicates the Home
widget. The Edit session page offers status radios (pending, started,
completed) that duplicate the Start and Complete actions and let a user set
"completed" without the loop that completion is supposed to mean. "Mark as
completed without explaining" on the session page competes directly with the
core action beside it. Practice is a page for two buttons, one of which is
an external link.

**9. Unclear controls and labels.** "Promote" on a curiosity item means
"start a session from this", and it only prefills Topic, so the user still
has to invent a Title. "Dismiss" writes a resolved timestamp, which is not
the same thing. Status chips are capitalized ("Completed") while mode chips
are not ("focus consume"). "Quick one" as a section heading reads as a
label for a button. The session list shows time of day for events where only
the day matters.

**10. Feedback leads with the verdict.** After an explanation the page shows
concept chips with correct/partial/missing, then Depth and Clarity, then
Omissions, then Misconceptions, and Connections last. The Drive analysis
already flagged this ordering as turning a mirror into a grade. The
follow-up question, which is the natural next hook, is a grey box at the
bottom with no action attached.

**11. Cognitive load in the session list.** Three rows of filters with
counts, each row a mini toolbar, above rows that each carry five chips, two
icon buttons, a timestamp, a resource link, and sometimes a Start button.
For a list that a single user will scan for one item, this is a database
admin view.

### Severity 1, cosmetic

**12.** "Export database backup" in the Home footer is a developer utility in
the user's primary view. **13.** Delete uses a browser confirm dialog rather
than undo. **14.** The 404 for a missing session is the framework default.
**15.** The Duration field placeholder "optional" and the URL placeholder
"https:// (optional)" are the only optional markers; required fields are
unmarked, which is backwards for a form where most fields are optional.

## Two cognitive walkthroughs

**Discovering something interesting and beginning to learn it.** A link is
open in another tab. Today's path: open Noesis, click New Session in the
header, type a Title, tab out and wait for a suggested Topic, correct it,
choose Listen or Focus, choose Consume or Practice, choose a Resource type
from twelve, skip Duration, paste the URL, optionally type a resource title,
skip Notes, decide between Add to backlog and Start now, land on the session
page, read the explanation prompt. Fourteen steps and at least six decisions
before any learning. The URL, the one thing the user actually has, is the
ninth field.

**Returning to unfinished learning.** The user watched half of something on
Tuesday and started a session. On Thursday: open Noesis, look past the
Mindscape box, look past Backlog, look past Quick one, scan Recent sessions
for a "Started" chip among "Completed" chips, click the title, scroll past
the metadata to the explanation box. Nothing on the Home page distinguished
"you have something in progress" from "you did some things recently", and
the path has no word for continue.

## Target UX

The earlier analyses settled the job: decide for me, hold me to one small
finishable thing, and let me make it mine while it is warm, with the
Mindscape as the reason to come back. The architecture below is derived
from that job and from the two walkthroughs. It replaces six sections with
three, and it turns the session from a form into a flow.

### Information architecture

| Place | What it is | What it replaces |
|---|---|---|
| **Now** | The Mindscape, full-bleed, with one thin layer over it: this week's thing and its state, anything in progress with a Continue action, one recall question, and a single capture field. | Home, Mindscape page, Practice |
| **Learn** | The session as a flow: Capture, Start, Explain, See what changed, Ask what's next. A History view sits behind it as a secondary tab, not as the landing page. | Sessions list, New session, Session detail, Edit session, Curiosity inbox, Backlog |
| **Concept** | A concept's story: every explanation in order, connections made, open questions, what it touches on the map. Reached from the map or from feedback, never from the nav. | Concept detail page, most of Practice |

Curriculum tracks leave the primary navigation. They become a "Tracks"
entry inside Learn, or a secondary nav that can hold ten tracks without
touching the app's structure. Export moves to a settings menu.

The nav is therefore three words: Now, Learn, Mindscape. Mindscape is a nav
item even though it is also the Now background, because the full map with
hover and click is a destination in its own right and because the nav is
where the product's identity is stated. The Practice page dissolves: the
daily recall lives on Now, and speaking prompts live on the concept page,
where they have context.

### The Learn flow

**Capture.** One field, everywhere, always the same: paste a link or type a
question. That is the whole backlog and the whole curiosity inbox, merged
into one inbox. A link becomes a thing to learn; a question becomes a thing
to find out. Title comes from the URL. Topic is suggested in the background
and shown as editable after the fact, not required before. Nothing else is
asked.

**Start.** One tap on an inbox item, or one tap on the capture field's
"start now". Environment and activity are not asked. If they are ever
recorded, they are recorded after the session as a one-tap "how did you
learn this?" with a skip, because at that point the user knows the answer.

**Explain.** The page that exists today, with three changes. The explanation
box is the page, not a card below metadata. The submit shows "Reading your
explanation…" and disables. "Mark as completed without explaining" is
removed; a session that is not explained stays in progress and is simply
visible on Now until it is, or until the user archives it from History.

**See what changed.** Feedback is reordered: connections you made first,
then what the map did because of them, then what you missed, with the
verdict chips demoted to a footnote. The Mindscape change should be visible
on this screen, not on a different page.

**Ask what's next.** The follow-up question is not a grey box. It is a
capture field prefilled with the model's question and an invitation to write
your own. Whatever is entered goes into the inbox and becomes the natural
next Start.

### The Now page

Now has one job: to say what Noesis is without a sentence of copy, and to
make the next action obvious. In order of visual weight:

1. The Mindscape, edge to edge, in whichever environment the user chose. It
   is the page's background and its argument.
2. In progress: any started session, one line each, with Continue. If there
   is nothing in progress, this layer is absent, not empty.
3. This week: the one committed thing, from the inbox, with its state. Not
   a streak, no missed state, just "this week" and the item.
4. One recall question, inline, answerable in place, as it is today.
5. The capture field.

Nothing else. No recent list, no backlog list, no export link. Those live in
Learn's History view.

### Unfinished learning

An in-progress session is the most prominent thing on Now after the map.
Its row says Continue. Its page opens on the explanation box. If a session
sits in progress for more than a week, it is still there, unchanged, without
a warning; the Hooked analysis ruled out any missed state, and the Drive
analysis ruled out any verdict about elapsed time.

### Walkthroughs under the target

Discover and begin: paste the link into the capture field, tap Start, read
the explanation prompt. Three steps, one decision.

Return: open Now, see Continue under the map, tap it, the explanation box
is focused. Three steps, no scanning.

### Fixes independent of the redesign

These are worth doing now regardless, because they are bugs or one-line
hierarchy corrections rather than architecture.

- Restrict the session list joins to the primary concept, or aggregate
  concepts per session, so a session appears once.
- Swap the button styles on the new-session form so Start now is primary.
- Add a pending state to the explanation submit.
- Give the concept page an active nav state.
- Remove the status radios from Edit session.
- Reorder feedback so connections come first.

## Styling, briefly and last

The drab impression has three causes, and only the third is paint.

First, sameness of container. Every block on every page is the same card:
white, one-pixel hairline border, large radius. When the Mindscape, a
backlog row, a recall question, and an export link all live in the same box,
nothing is more important than anything else, and the map that is the whole
point of the product reads as a widget.

Second, absence of hierarchy in type. Page titles are `text-lg`. Section
headings are `text-sm` in mid grey. There is no size above 18px anywhere,
so no page has a top. The eye has nowhere to start, which is what "flat"
means.

Third, a palette that is entirely zinc. The only color on any screen is in
status chips, so color signals administrative state rather than knowledge.
In the target, color belongs to the Mindscape's domain hues and nowhere
else, so that the map is the most colorful thing on every screen it appears
on.

The order of work is therefore: information architecture, then the Learn
flow, then Now, then type and containers, then color. Restyling the current
six modules would produce six prettier modules.

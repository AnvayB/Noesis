# Noesis design language

Three art directions for the whole product, a decision, and the design
language of the chosen one, written before any code was touched. The brief:
contemplative, curious, intelligent, exploratory, slightly mysterious,
artistic, alive. Not corporate, not a productivity app, not gamified, not
childlike, not science fiction, not purple-gradient AI software. The
Mindscape is the visual soul.

## Three directions

### 1. Survey

The product is a cartographer's table. Everything sits on a sheet of
unbleached survey paper that already carries the faintest contour texture,
and the Mindscape is not on the page, it is the page: the map that the rest
of the interface is annotated onto. Ink is iron-gall blue-black, never pure
black. Color exists only where knowledge exists, in the six muted field hues
of the Mindscape, so a screen with no learning on it is nearly monochrome
and a screen with a year of learning is quietly full of color. Type is a
soft serif with optical sizes for everything read and a plain sans for
everything operated. Night is not a dark mode. It is the same survey sheet
at night: ink and paper trade places, the contours stay, and the live tips
glow a little more.

What it communicates: patience, permanence, scholarship without the
academy. The feeling of a desk where someone has been working for years.
"Alive" comes from the one thing that moves, the luminous tips of what you
are learning now, against a ground that is otherwise perfectly still.
"Mysterious" comes from the fog: the parts of the map nobody has walked.

Risk: dust. A paper-and-serif direction can drift into the cream-and-clay
look that half the web now wears. The defense is the paper stock, greyer
and cooler than cream, the colored ink, and a strict rule that the only
accent colors are the field hues, with no warm-clay call-to-action anywhere.

### 2. Observatory

The product is a night sky. Both themes are dark, the light one a pale
pre-dawn blue-grey rather than white. Concepts are stars, fields are
regions, retention is nebula, and the interface chrome is set in a quiet
geometric sans with prompts and questions in a serif italic, like captions
under a plate in an astronomy book. Motion is slow parallax and a barely
perceptible twinkle on what is recent.

What it communicates: wonder and curiosity first, then mystery. Looking up.
The emotional register is closest to the brief's "slightly mysterious" and
"exploratory", and an almost empty sky is already beautiful, which solves
the cold-start problem for free.

Risk: it is the direction most likely to become a cliché within two years,
because dark-with-glow is what AI products default to now, and because a
constellation is a node graph in a nicer coat. Writing long explanations on
a dark ground is tiring, and explaining is the core act. Relationships
across the sky need lines, and lines are edges.

### 3. Herbarium

The product is a naturalist's field notebook. Oat and kraft paper, a
ruled writing surface, moss and ochre, botanical-plate illustration. The
Grove is the Mindscape: each field a tree, each concept a branch, retention
as foliage, weak knowledge as winter. Type is a high-contrast display serif
with a handwritten warmth, and small specimen-label captions.

What it communicates: growth, care, tactility, the patience of tending
something. It is the most "alive" of the three in the literal sense, and the
most legible to a newcomer.

Risk: twee. One wrong choice in illustration or type and it reads as a
journaling app for children. Trees also read as counts, which the earlier
analyses ruled out, and the grove fails when sparse: five concepts is a twig.

### Decision: Survey

Survey is the strongest direction for Noesis for four reasons. It is the
only one in which the Settling Ground grammar the Mindscape work settled on
lives natively, with contours, fog, and threads as first-class marks rather
than a skin. It supports the core act, which is writing, because paper by
day is the ground people write on longest. Its night state delivers the
mystery the brief asks for without making the product dark by default. And
it is the least likely of the three to age into the look of its era.

The one thing the Observatory does better, beauty when empty, is borrowed:
the empty Mindscape is fog on paper, not an empty box with a sentence in it.

## The design language

### Paper, ink, and the six hues

| Token | Day | Night | Role |
|---|---|---|---|
| paper | `#e9e6dd` | `#15191c` | The ground of every page. Greyer than cream on purpose. |
| sheet | `#f4f2ea` | `#1c2226` | The only raised surface: where you write. |
| ink | `#1b2a33` | `#e6e1d6` | Text and marks. Blue-black, like iron gall. Never neutral black. |
| ink-soft | `#5b6770` | `#9aa3a8` | Secondary text, metadata, quiet labels. |
| rule | ink at 16% | paper at 14% | Hairlines. Used for row separation, never for boxing. |
| lamp | `#c99a2e` | `#d8ad4a` | The one accent that is not a field hue: what is happening now. Focus rings, live tips, the in-progress marker. |
| ochre, teal, rose, slate, moss, copper | `#b8863b` `#3f7f82` `#b5566a` `#5d6b8a` `#6f8a4a` `#a9603a` | slightly lifted at night | Field hues. They belong to the Mindscape and to references to concepts, and nowhere else. |

No status chips in semaphore colors. A session's state is a word. A
concept's understanding is its mark on the map.

### Typography

Two families, clearly distinct.

- **Fraunces**, a soft serif with optical sizing, for everything that is
  read as prose or as a title: page titles, session titles, explanations,
  prompts, lesson text, concept names. Its italic is used for questions the
  app asks, so a question always looks like a question.
- **Geist Sans**, already in the project, for everything operated: nav,
  buttons, form labels, metadata, lists. Geist Mono only for file paths in
  the curriculum, where a monospace face is the honest choice.

Scale, in pixels: 13, 15, 17, 19, 23, 30, 40, 52. Titles are light, not
bold. Reading text is 19px Fraunces at 1.6 line height, never wider than
64 characters. UI text is 15px Geist at 1.5. No uppercase labels, no
letterspaced eyebrows, no monospace metadata.

### Spacing and layout

A 4px base. Page gutters of 24px on phones and 40px above. Sections are
separated by vertical space, 56 to 72px, not by boxes. Reading columns are
narrow, 40rem. The Mindscape and the nav are the only full-width elements.
Everything is left-aligned; nothing is centered except the map.

### Surface hierarchy and depth

Three levels, and only three.

1. **The map.** The Mindscape sits under the page. On Home it is the top of
   the page with no border, fading into the paper through a gradient. On its
   own page it is the whole page.
2. **The ground.** Paper, carrying a fixed contour texture at four percent
   opacity across the whole app, so every screen is a sheet on the same
   table.
3. **The sheet.** One raised surface, lighter than the ground, with a
   hairline top rule and a shadow so soft it reads as a second sheet of
   paper laid on the first. Used for exactly two things: the place where you
   write an explanation, and the recall question that asks you to remember.

No cards. Lists are separated by hairline rules. There are no shadows other
than the sheet's.

### Motion and transitions

Two durations: 240ms for anything the interface does, 700ms for anything the
map does. One easing, `cubic-bezier(.2,.7,.2,1)`. The page's main content
fades in once on load, opacity only, no slide. The live tips on the map
breathe on a four-second cycle. Links change underline offset on hover.
Nothing lifts, scales, or bounces. Reduced motion turns all of it off.

The one orchestrated moment is the explanation submit: the button reads
"Reading your explanation…" and the sheet dims slightly until the feedback
replaces it.

### Iconography

Almost none. Five line icons at 1.25px stroke in ink: menu, close, theme,
edit, delete. Every primary action is a word. Nothing is icon-only except
the theme toggle and the mobile menu, which carry labels for assistive
technology.

### Learning-session surfaces

A session is a chapter. A quiet context line, then the title in Fraunces at
30px, then the resource plate, then the sheet. Metadata is a single sentence
in ink-soft, not a row of chips. The explanation box is the page's center of
gravity: full column width, tall, on the sheet, with the prompt set in
Fraunces italic above it.

Feedback is margin notes, in this order: connections you made, what the map
did, what you left out, what needs correcting, then the depth and clarity
words in a footnote. The follow-up question is set in italic and is the
last thing on the page.

### Article and video presentation

A resource is a plate: the type as a small word, the title in Fraunces, the
link. A YouTube resource embeds the video in the plate at 16:9 through the
privacy-enhanced player, so watching and explaining happen on one screen. An
article gets a plain open link. The plate has no border; it is set off by
the space around it.

### Mindscape integration

The map is rendered in the Settling Ground grammar as far as the current
data allows. Concepts have no circles. An encountered concept is a spore, a
short curl. A familiar one is a thin ring with a few short threads. One you
can explain is a filled mark with threads reaching out, a small bloom. A
retained one carries contour rings. Relations are curved cords in the hue of
their field, where field is the connected cluster the concept belongs to.
Anything touched in the last two weeks glows in lamp. Nothing fades with
time. Names are set small in Fraunces italic and brighten on hover.

On Home the map is the first thing on the page and the only thing above the
fold that is not text. In-progress learning sits directly under it, marked
in lamp, with the word Continue.

### Words

Sentence case everywhere. Buttons say what happens: Start, Continue, Save
explanation, Keep for later. "Add to backlog" becomes "Keep for later" and
is the quiet option; "Start now" is the primary. "Promote" becomes "Start
learning this". "Dismiss" becomes "Let it go". Empty states are invitations:
"Nothing kept for later" rather than "No results".

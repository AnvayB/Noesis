# Semantic-to-visual mapping for the Mindscape

This document decides, property by property, what the Mindscape shows and
what it refuses to show. It builds on the Settling Ground grammar in
`visual-grammar.md` and is meant to be the reference the implementation is
checked against: if a future feature wants to add a visual channel, it has
to argue against the rules here.

The companion sketch `primer.html` is a field guide. It shows each rule in
isolation, nine small scenes on one sheet, so the reading can be learned the
way a map legend is learned: once, and then never needed again.

## The principle of restraint

A visualization becomes unreadable when every field owns a channel. The
Mindscape has roughly twelve visual channels available and thirteen candidate
properties, and the temptation is to pair them off. Three rules prevent that.

1. **One property per channel, one channel per property.** No double
   encoding. If thickness means revisits, nothing else may change thickness.
2. **Encode acts, not judgments.** The picture draws what you did: explained,
   connected, returned, asked. It does not draw what the system thinks of
   you: confidence, clarity scores, mastery percentages. Judgments belong in
   the feedback text, once, and then they are gone.
3. **Nothing countable, nothing that decays.** Channels saturate rather than
   scale, so ten revisits look like four, and time never subtracts.

Six properties earn a channel. The rest are invisible on purpose, and the
reasons are recorded so they stay invisible.

## The six sentences

This is the entire grammar someone needs to read their Mindscape. Each
sentence is one rule, and each rule owns exactly one visual channel.

| | Rule | Channel | Property |
|---|---|---|---|
| 1 | **Where it is, is what it is about.** | Position and hue family | Topic |
| 2 | **How far it reaches is how well you understand it.** | Colony extent | Depth of understanding |
| 3 | **How thick it is, is how often you have come back.** | Thread thickness | Revisits |
| 4 | **A cord with a bloom is a connection you made yourself. Two colors means across fields.** | Cord, bloom, two-tone | Synthesis, cross-domain connection |
| 5 | **Contours are what has settled. They never go away.** | Ground: contour lines, height, tint | Retention |
| 6 | **A dotted reach is a question you still have. A dark stub is something you got wrong.** | Two small marks | Uncertainty, misconception |

One rule of motion sits outside the six, because it encodes the present
rather than a property: **only what is happening now glows.** A luminous tip
means an explanation from the last week or two. Nothing else in the picture
moves except a question, which keeps reaching very slowly into the fog.

## Property by property

The thirteen properties from the brief, plus the ones the schema actually
holds. Each is either assigned to a channel above, folded into another
property, or declared invisible with the reason.

### Visible

**Topic.** Position on the map and the hue family of the region. Position
should come from semantic embedding of concept descriptions so that related
fields are neighbors and unrelated fields are far apart. Hue is assigned per
region from a small muted family, six hues at most, and a region keeps its
hue for life. This is the first thing anyone learns to read, within the
first session, because it is the only thing that is legible at a glance.

**Subtopic.** Folded into topic. A subtopic is a concept that sits closer to
its siblings than to the rest of its region. It gets no mark of its own, no
nesting, no outline. Proximity is the whole encoding. If subtopic hierarchy
were drawn, the map would become an org chart.

**Concept.** The origin of a colony, and never marked. A concept is where
its threads meet. The name appears on hover in the app and nowhere in the
art. This is the rule most likely to be broken by a well-meaning feature,
and it is the one that keeps the Mindscape from becoming a node graph.

**Depth of understanding.** Colony extent, which is the accumulated growth
budget of every explanation of that concept, weighted by the depth the
analysis assigned. Surface explanations reach a little. Deep ones reach far.
This is the derived state Encountered through Retained, drawn as a
continuous quantity instead of a label. When the concept settles, extent
becomes footprint and depth becomes height, so the same property is read
from land instead of thread.

**Revisits.** Thread thickness. Re-explaining a concept spends its budget on
thickening what exists before extending it, so a concept explained four
times is a dense cord network of the same reach, not a bigger colony. The
thickness saturates around the third or fourth return. Beyond that a revisit
is still recorded in the data, but the picture stops changing, which is the
point: the map should not reward the fifth repetition of a thing you know.

**Synthesis between ideas.** A cord ending in a bloom. This is drawn only
for connections the user made in their own words, the `connectionsMade`
output of an explanation. Relations the model inferred but the user never
stated steer growth, as chemotropism, but do not fuse. The distinction
matters because the bloom is the most rewarding mark in the picture and it
must be unforgeable: it can only appear because you thought something.

**Cross-domain connection.** The same cord and bloom, with both regions'
hues mixed along the cord and a larger bloom. When both concepts later
settle, the ground between their regions rises into a pass. This is the
rarest event and the largest, and the grammar spends its only two-color mark
on it.

**Retention.** The phase change from thread to ground. When the derived
state reaches Retained, which today means a successful recall after time has
passed, the colony's threads fade toward the paper over a few weeks and a
contoured hill rises beneath them, tinted faintly with the region's hue and
snow-capped if tall. The land is only ever added to. It is the one part of
the picture that is fully permanent, and it is the part that is meant to be
beautiful in a year.

**Uncertainty.** An open question from the curiosity inbox, drawn as a
dotted thread reaching outward from the concept it belongs to, ending in a
faint ring, growing very slowly forever. Resolving the question turns it
into an ordinary thread toward wherever the answer landed. Uncertainty the
user knows about is drawn. Uncertainty the system infers is not; see
confidence below.

**Misconception.** A short dark stub ending in a dot. Not in the brief's
list, but the schema records it and it is the one judgment the picture does
draw, because a misconception is a fact about the explanation, not a score
about the person, and because the mark is small, and because it is the
thing a later correct explanation visibly grows past.

### Invisible, and why

**Confidence.** Not drawn. The app derives a confidence estimate from status
and recency, and it is exactly the kind of judgment that turns the artwork
into a report card. Depth of understanding already carries the honest
version of this signal through extent, and recall outcomes carry it through
retention. A separate confidence channel would double-encode and would
invite the reading "the system thinks I am weak here," which is the reading
that makes people stop opening the app.

**Prerequisite relationships.** Not drawn as structure. The schema stores
relation types related, prerequisite, and part_of, and the temptation is an
arrow or a tree. Instead, a prerequisite relation only sets the direction of
growth: the later concept's threads grow toward the prerequisite, so a
region's grain runs from newer knowledge back toward its foundations. Someone
who looks at a region for months will notice the grain without ever being
told it is there. No arrowheads, no layers, no hierarchy.

**Source count.** Not drawn. Sources are consumption, and consumption leaves
a spore only. A concept met in five videos and never explained is one spore.
A concept met once and explained deeply is a colony. Drawing source count
would reward collecting, and collecting is the behavior the whole product is
trying to displace.

**Time since learning.** Not drawn as decay. Time is encoded as layering:
later threads cross over earlier ground, and the ground itself was built in
order. Recency is encoded only as the glow of live tips, a binary signal
that switches off after a week or two. There is no fade, no dimming, no
overdue state. A month of not learning changes nothing about the map except
that nothing is glowing.

**Clarity of explanation.** Not drawn. This is a judgment about prose, and it
belongs in the feedback text.

**Environment and activity mode.** Not drawn. Listen versus focus, consume
versus practice, are facts about how the learning happened, not what was
learned. The picture is about the what. At most they could tint the paper
grain of a session, but the default is nothing.

**Duration.** Not drawn. Hours studied is the metric the original spec
rejected, and it is the easiest one to game.

**Partial understanding.** Folded into depth. An explanation that got a
concept partially right releases a smaller growth budget. There is no
special mark for "partial", because the reach already says it.

## The channel budget

A check that no channel is doing two jobs.

| Visual channel | Owned by | Notes |
|---|---|---|
| Position | Topic | From embeddings when available |
| Hue family | Topic | Fixed per region for life |
| Colony extent | Depth of understanding | Becomes footprint on settling |
| Ground height | Depth of understanding | Same property, settled form |
| Thread thickness | Revisits | Saturates |
| Cord and bloom | Synthesis | User-made connections only |
| Two-tone cord | Cross-domain connection | The only two-color mark |
| Contour lines and tint | Retention | Permanent |
| Dotted reach | Uncertainty | Open questions only |
| Dark stub | Misconception | Small, grown past later |
| Luminous tip | The present | Binary, recent or not |
| Fog | Nothing learned here | A property of empty ground, not of any concept |

Channels deliberately left unused, so they stay available for one future
property each: **built structure** on the land, reserved for the Applied
state the spec describes and nothing else, and **paper grain**, reserved in
case session mode ever needs a whisper of a mark.

## Structures, and what they come to mean

The grammar is six rules, but what someone actually learns to read over
months is structures, the way a hiker reads terrain. These are the readings
the grammar produces without any of them being drawn explicitly.

| What you see | What it means |
|---|---|
| A scatter of spores with nothing growing | Collecting without learning. The honest picture of a bookmark folder. |
| One wide colony in an otherwise empty region | You went deep on one thing and nothing around it yet. The most common shape in month one. |
| A dense, thick, compact colony | Something you keep returning to. It is not getting bigger. It is getting sure. |
| Two colonies grown into one network | A field where you have started connecting things. Same hue throughout. |
| A two-tone cord between distant regions | The bridge. You saw that two fields you thought were separate are not. The rarest thing on the map and the one worth looking for. |
| A hill with fresh threads growing on it | You came back to something you had already settled, and it is growing again. This is the return-as-someone-new loop drawn. |
| A settled range with a live colony at its edge | Knowledge extending from a foundation. The healthiest shape the map can have. |
| Contours that touch, with a saddle between | Two fields whose bridge has settled. The map now treats them as one landform. |
| A dotted reach into the fog | A question you are still carrying. If it reaches something later, that is an answer. |
| Threads with a dark stub in them | You had something wrong once. The threads that grew past it are the correction. |
| A large settled landscape with nothing glowing | You know a lot and have not learned anything this month. Not a warning. A resting picture. |

## The intuition ladder

What a person can read, in the order they will learn to read it.

- **First session.** Color means field. That is all, and it is enough.
- **First month.** Reach means understanding. The one thing you went deep on
  is visibly larger than the things you skimmed.
- **Second month.** Cords and blooms. You start to notice that the map only
  connects things when you connected them, and you start looking for the
  next connection while you are explaining.
- **Third month.** The first contours. Something you learned in month one
  has settled into ground, and you understand that the threads were never
  the point.
- **Half a year.** Structures. Ranges, passes, a colony growing on old
  ground. You can look at a region and know its history without remembering
  it.
- **A year.** The whole map reads as one shape, and the shape is yours.

## Why this many rules and no more

Six rules is roughly the size of a map legend, and map legends are the only
visual grammars most people ever learn fluently without instruction. Each
rule was tested against a single question: would removing it make the map
lie? Remove position and the fields blur together. Remove extent and shallow
equals deep. Remove thickness and returning equals never returning. Remove
the cord and the bloom and the best moment in the product has no mark.
Remove the contours and nothing is permanent. Remove the two small marks and
the map pretends you have no doubts. Everything else that was proposed
failed that test, which means it was decoration, and decoration is the
first thing a person learns to stop seeing.

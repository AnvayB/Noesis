# The Mindscape: a visual grammar

Design notes for the Noesis Mindscape, the abstract living artwork generated
from what the user has genuinely learned. This document explores five
computational metaphors against the same set of learning data, judges each
against the constraints the earlier product analyses established, and then
commits to one grammar, written as an algorithmic philosophy in the form the
`algorithmic-art` skill expects. The companion sketch in `viewer.html`
expresses that grammar with a synthetic learning history so the response to
data can be seen before any of it is wired to the real database.

This is not a UI redesign. It is the grammar the UI will eventually host.

## What the artwork has to say, and what it must not say

The data available today, from `lib/db/schema.ts`:

| Signal | Source |
|---|---|
| A concept exists, and when it was first and last met | `concepts` |
| Its derived state: Encountered, Familiar, Understood, Can Explain, Applied, Retained | derived at read time |
| Each explanation, its depth (surface, solid, deep) and clarity | `explain_backs`, `concept_understandings` |
| Per concept, whether an explanation got it right, partially, or wrong | `explain_back_concepts` |
| Relations between concepts, LLM-inferred or manual | `concept_relations` |
| Connections the user made in their own words | `connectionsMade` |
| Misconceptions | `concept_understandings` |
| Recall attempts: remembered, partial, forgot | `recall_attempts` |
| Open questions, and when they were resolved | `curiosity_items` |
| How the learning happened: listen or focus, consume or practice, duration | `learning_sessions` |

The constraints, inherited from the Jobs-to-be-Done, Drive, and Hooked
analyses. Any grammar that violates one of these is disqualified no matter how
beautiful it is.

1. **Consumption leaves a seed, never a structure.** Watching something must be
   visibly not the same as knowing it.
2. **Explanation gives form. Connection gives the most form.** A bridge between
   distant regions is the rarest and largest event in the picture.
3. **Depth outgrows breadth.** A second explanation of one concept, from a new
   angle, changes more than a first explanation of a tenth concept.
4. **Settled knowledge becomes permanent and dense. It does not fade.** Growth
   is the loudest signal on screen. Neglect is quiet.
5. **No counts, anywhere.** Nothing in the image should be countable at a
   glance, or the count becomes the goal.
6. **Beautiful when sparse.** Five concepts must look like the beginning of
   something, not a failure.
7. **Beautiful before decoding.** A stranger should want to look at it without
   knowing what any of it means.
8. **Not a node-edge graph.** Concepts are not circles. Relations are not lines.
9. **Living, not restless.** It should reward being looked at, and it should
   never become the thing you open instead of learning.

## Five metaphors

Each metaphor is tested against the same eleven properties the brief asked
for. The verdict at the end of each is against the constraints above.

### 1. Organic branching

One organism growing from the first thing ever learned. Limbs are domains,
branches are concepts, growth is understanding, wood is retention.

| Property | Encoding |
|---|---|
| Structure | A single trunk from the root concept. Domains are limbs at different angles around it. Concepts are branches off their domain's limb, ordered by first encounter along the limb. |
| Distance | Angular position around the trunk from semantic similarity. Distance along a limb is time. |
| Growth | Each explanation extends a shoot. Length from depth: surface a few pixels, deep a long reach. An encounter is a bud that never opens on its own. |
| Density | Many explanations in one domain produce a thicket of fine twigs. |
| Size | Limb thickness follows the pipe model real trees obey: a parent's cross-section equals the sum of its children. Depth in one place thickens the limb below it more than breadth does, which satisfies constraint 3 for free. |
| Motion | A slow sway proportional to how young a branch is. New growth unfurls over a few seconds. Old wood is still. |
| Texture | Young shoots smooth and translucent. Retained wood gains bark grain. A misconception is a gall, a knot in the wood that stays until regrown. |
| Brightness | Recently touched shoots carry a faint glow. Old wood is matte. |
| Branching | A shoot branches when an explanation mentions several concepts at once. |
| Color | Hue drifts with angle around the trunk, one hue family per domain. Saturation from recency. Retained wood darkens toward a shared bark tone, so the palette matures over months. |
| Emergent connections | Grafts. Two branches from different limbs fuse where a cross-domain connection was made. Over a long time the crown closes and grafts become the structure holding it up. |

**Verdict.** It fails constraint 6 badly: five concepts is a twig, and a twig
is sad. It strains constraint 8, because a tree is a graph with a coat of
bark. It implies a hierarchy the data does not have, and it turns "how big is
my tree" into a score. The pipe model and the graft are worth stealing.

### 2. Constellations

Concepts are stars. Domains are regions of sky. Retained knowledge is a nebula
of accumulated gas. Connections are not lines but shared light.

| Property | Encoding |
|---|---|
| Structure | A star field on an unbounded sky. Clusters where domains are. Nebulae where many explanations have accumulated in one region. |
| Distance | Semantic position on the sky. Depth of field from age: older knowledge sits deeper, with parallax on slow pan. |
| Growth | An encounter is a pinprick. Each explanation raises magnitude. Retention makes a star stable and gives it diffraction spikes. |
| Density | Star density per region, and gas density inside nebulae. |
| Size | Apparent magnitude. |
| Motion | Proper motion so slow it is only visible across sessions. Recent stars twinkle. Nebulae turn imperceptibly. |
| Texture | Nebula gas from layered noise. Retained stars get spikes. |
| Brightness | The primary channel, from depth of understanding. Forgetting must not dim a star, or constraint 4 breaks, so recency is carried by color instead. |
| Branching | None natively. |
| Color | Blackbody temperature. Recently reinforced stars burn blue-white. Old settled ones drift warm and large, like red giants, which are old, big, and luminous. A misconception flickers. An open question is a comet with a tail pointing at nothing yet. |
| Emergent connections | Light between nebulae. A constellation figure is drawn only when every star in a cluster has reached Can Explain, so the line is earned and rare. |

**Verdict.** It passes constraint 6 best of all five: an almost-empty sky is
already beautiful. It fails constraint 8 hardest: the moment a relationship
needs expressing, stars plus lines is a node-edge graph with a dark theme.
Relationships are the whole point of the Mindscape, so this is the wrong
primary grammar. The earned constellation line and the blackbody palette are
worth stealing.

### 3. Mycelial growth

No concept is drawn. Only the threads that grow out from it are drawn, and the
picture is the network. This is the only metaphor where the connection event
is a real biological event with its own name, anastomosis, the fusion of two
hyphae into one organism.

| Property | Encoding |
|---|---|
| Structure | Each concept is an inoculation point in a substrate. Hyphae grow outward from it. Colonies of related concepts merge into one network. The image is the network, with no marker at the origin. |
| Distance | Substrate position from semantic embedding. Hyphae grow toward related concepts by chemotropism: a related concept is a nutrient source and tips steer toward it. |
| Growth | Explanation is the growth budget. Surface releases a little, deep releases a lot. Consumption releases none: an encounter is a spore that has landed and waits. |
| Density | Reinforcement thickens. Paths that carry repeated connection, the way slime mold reinforces routes it uses, bundle into cords. Unused threads thin but never vanish. A mature network has highways and capillaries. |
| Size | Colony extent. |
| Motion | Tips extend in time-lapse. A successful recall sends a pulse down the cord. Settled cords do not move. |
| Texture | Fine fractal filaments. Cords become opaque and almost woody. A misconception is a melanized hypha, dark and short, that must be regrown past. |
| Brightness | Live tips are faintly luminous. Cords are matte. |
| Branching | Branching rate from how many concepts an explanation touched. |
| Color | Pale threads on a dark substrate, one hue family per domain. Where two colonies fuse, their hues mix along the fused path. Synthesis is literally a mixed color. |
| Emergent connections | Two colonies that grew as separate islands meet and become one organism. This is exactly the moment the product analyses identified as the most valuable: the bridge between previously unrelated topics, and it is the most dramatic event the metaphor can produce. |

**Verdict.** Passes constraints 1, 2, 3, 4, 8, and 9 more naturally than any
other. It is delicate when sparse. The risks are aesthetic: it can read as
mold, and a dark substrate is the default. It does not on its own say
"permanent". Cords help but a thread is still a thread.

### 4. Topographic landscape

Knowledge raises land. Concepts are peaks, domains are ranges, retained
knowledge is bedrock under snow. Drawn as a contour map.

| Property | Encoding |
|---|---|
| Structure | A heightfield. Peaks where concepts are, massifs where domains are, valleys where nothing is known yet. Contour lines at a fixed interval. |
| Distance | Semantic position on the map. Height is depth of understanding. |
| Growth | An explanation deposits height. An encounter is a survey marker on flat ground, or a slight mound. Recall success consolidates: the peak resists erosion. |
| Density | Many related peaks fuse into a range, and the space between them fills. Valleys between ranges are visibly unexplored and quietly inviting. |
| Size | Peak height and footprint. Depth adds height. Breadth adds footprint. Height reads as more, which satisfies constraint 3. |
| Motion | The land is still. Light moves across it with time of day. Fog drifts over regions never visited. Living without any datum ever moving. |
| Texture | Contour lines, hatching on steep slopes, snow above a threshold for Retained. A misconception is a scar. An open question is a fog patch with a marker inside it. |
| Brightness | Lighting direction. Recently touched slopes catch the light. Nothing ever darkens. |
| Branching | Ridgelines branch naturally off a massif. |
| Color | Hypsometric tints, the elevation palette of a good atlas, pale at low ground and deep at height. Subtle hue shift per domain. Paper, not screen. |
| Emergent connections | A pass. When a bridge is made between two ranges, the land between them rises into a saddle and the ranges become one. Trails wear in along paths used repeatedly. |

**Verdict.** The strongest on constraints 4, 5, 6, and 7. Land does not fade,
a map does not count, a few hills in fog looks like the start of a country,
and contour maps are beautiful to people who cannot read them. It is weaker
on constraint 9, because nothing lives, and weaker on the connection event,
because a pass is a quiet thing. Its danger is genericness: contour-line
generative prints are common.

### 5. Flowing field

Concepts shape a vector field. Particles flow through it and leave ink. The
picture is the accumulated trail.

| Property | Encoding |
|---|---|
| Structure | Each concept is an attractor with a basin. Particles born at the edges flow inward and between basins. The image is trail density. |
| Distance | Attractor positions from semantic embedding. Streamlines connect what is near in the field. |
| Growth | Explanation deepens the basin, capturing more flow. An encounter is a weak eddy. |
| Density | Trail density is accumulated study. Settled knowledge is set ink; recent learning is live particles still moving. |
| Size | Basin radius. |
| Motion | Intrinsic and constant, which is the problem. |
| Texture | Streamline hatching. Turbulence where two attractors disagree, which is where misconceptions live. |
| Brightness | Particle speed. Live ink over set ink. |
| Branching | Streamlines bifurcate at saddles between basins: a concept sitting between two domains splits the flow. |
| Color | Ink hue per domain. Flows that merge mix pigment. Synthesis mixes color, as in the mycelial grammar. |
| Emergent connections | A current. When two basins connect, particles begin to flow between them and a river of ink appears. Visible, dynamic, and rare if basins start far apart. |

**Verdict.** Beautiful and immediate, and the most likely to become a
screensaver, which violates constraint 9 in the specific way Hooked warned
about: a restless picture is an ambient reward for opening the app. It is also
the most common aesthetic in generative art. The saddle bifurcation is worth
stealing as a way to place a concept between two domains.

### A sixth, temporal grammar that can sit under any of these

Growth rings. The weekly rhythm from the Jobs-to-be-Done analysis is a natural
ring: one ring per week, thick when the week was deep, thin when it was
shallow, absent when there was no week. Rings are countable, which breaks
constraint 5 if they are the primary image, but as the interval between
contour lines they encode time without inviting a count.

## Comparison against the constraints

| Constraint | Branching | Constellation | Mycelium | Topography | Field |
|---|---|---|---|---|---|
| 1. Seed, not structure | ok | ok | strong | ok | ok |
| 2. Connection is the biggest event | weak | weak | strongest | ok | strong |
| 3. Depth outgrows breadth | strong | weak | ok | strong | weak |
| 4. Settled is permanent, growth loudest | ok | ok | ok | strongest | ok |
| 5. No counts | weak | weak | strong | strongest | strong |
| 6. Beautiful when sparse | fails | strongest | ok | strong | ok |
| 7. Beautiful before decoding | ok | strong | strong | strong | strong |
| 8. Not node-edge | weak | fails | strongest | strongest | strong |
| 9. Living, not restless | ok | ok | strong | weak | fails |

Two grammars win on complementary constraints. Mycelium owns the connection
event and the living quality. Topography owns permanence, sparseness, and the
refusal to count. They also share a substrate: both are things that happen on
ground. The recommendation is to make one grammar out of the two, and the
seam between them is where the meaning lives.

## The recommended grammar: Settling Ground

The idea is a phase change. Understanding begins as a living thread and, when
it holds, settles into land. The same concept has two lives in the picture.
While it is being learned, it is mycelium: fine, luminous, growing, reaching
toward what it is related to. Once it is retained, it sinks into the ground it
grew on and raises that ground. The thread fades toward the paper and a hill
appears where it was. Months later the picture is a landscape with a living
network growing across its surface, and the landscape is the record of every
network that has ever settled.

### Data dictionary

| Learning event | What happens in the picture |
|---|---|
| A concept is encountered, nothing explained | A spore: a single short pale thread, a few pixels, resting on the ground. It does nothing else until explained. |
| First explanation, surface depth | The spore germinates. A small colony of threads grows outward, tips luminous in the domain's hue. |
| Deeper or repeated explanation | More growth budget. The colony extends and branches. Repeated explanation of the same concept thickens existing threads into cords instead of only adding new ones, which is how depth outgrows breadth. |
| LLM-inferred relation to a concept already in the picture | Chemotropism. Tips steer toward the related concept. Nothing is drawn between them yet. |
| A connection the user made in their own words | Anastomosis. A tip reaches the related network and fuses. A small bloom marks the fusion and the path between the two colonies thickens into a cord. |
| A connection across domains | The same fusion, with both hues mixing along the cord and a larger bloom. When the cord later settles, the ground between the two ranges rises into a pass. This is the rarest and largest event. |
| A misconception | A melanized segment: a short thread that goes dark and stops. Regrowth past it comes from the next explanation that gets it right. |
| Recall success, or an explanation after a long gap | A pulse of light travels along the concept's cords. Retention advances. |
| Retention, the concept holds after time has passed | Settling. Over a few weeks the colony's threads lose saturation and sink toward the paper, and the heightfield underneath rises: a hill, contoured, tinted with the domain's hue. Cords become ridgelines. Passes become saddles. Nothing about this is reversible. Land does not fade. |
| An open question | A searching tip: a thin thread growing outward from the colony into empty ground, ending in a faint ring, still growing very slowly. Resolving the question turns it into an ordinary thread toward wherever the answer landed. |
| Regions never learned | Fog. Low ground under a drifting noise wash. The valleys are the invitation. |
| Time passing without learning | Nothing. Threads do not decay. Ground does not erode. The only sign of absence is that nothing is currently luminous. |
| Listen versus focus, consume versus practice | Not encoded in form. These are choices about how learning happened, not what was learned, and the picture is about the what. They could tint the paper grain per session, never the structure. |

What is deliberately not in the picture: labels, counts, a legend, or any
marker at a concept's origin. A concept is where its threads meet. In the app
a hover will reveal the name; the artwork itself never says it.

### Algorithmic philosophy

**Settling Ground**

Settling Ground is a movement about the two speeds of understanding. The
fast speed is the thread: understanding as an act, reaching outward from the
moment of explanation toward everything it might touch, luminous because it is
still happening. The slow speed is the ground: understanding as a thing that
has already happened, that has been held long enough to stop being an event
and become terrain. The movement exists in the seam between them, in the
moment a thread stops reaching and begins to sink, and the land underneath
takes on its shape. Nothing in the picture is a symbol of knowledge. Every
mark is the residue of an act of understanding, drawn once and never erased.

The threads grow by a space-colonization process with chemotropism. Each
inoculation point releases a budget of growth proportional to the depth of
the explanation that fed it. Tips extend along a direction that is the sum of
their momentum, a curl-noise field that gives every colony its own grain, and
an attraction toward related inoculation points that grows stronger as the
tip nears them. Tips branch at a rate that falls with their generation, so
colonies are dense near their origin and sparse at their reach. When a tip
comes within reach of another colony's threads, the two fuse, and a
reinforcement pass thickens the shortest route between the origins into a
cord. Repeated explanation of the same concept spends its budget on
reinforcement first and extension second. This is a meticulously crafted
algorithm: the branching decay, the noise octaves, the attraction falloff, and
the reinforcement rule have to be tuned together until a colony of forty
segments and a colony of four thousand both look inevitable, and that tuning
is the work of someone at the very top of the field.

The ground is a heightfield rendered as contour lines on paper with a
hypsometric tint. It is the sum of one radial deposit per settled concept,
whose height is that concept's accumulated depth and whose footprint is its
colony's extent, plus one ridge deposit per settled cord, plus a low
fractional-Brownian relief so that flat ground has the grain of real land.
Contour lines are extracted by marching squares at a fixed interval. Steep
slopes hatch. Above a threshold the tint goes to snow. Below a threshold a
drifting fog, a noise wash in the paper's own color, softens ground nobody has
walked yet. The heightfield is only ever added to. The product of deep
computational expertise here is restraint: the contour interval, the
hypsometric ramp, and the fog density were chosen so that the map is
beautiful with two hills and still legible with two hundred.

Settling is the phase change, and it is drawn as a crossfade over a few
simulated weeks. A colony's threads lose saturation and alpha toward the
paper while its deposit rises in the heightfield beneath it, so that at the
midpoint of settling a thread and a contour line coincide, and the eye
watches an act become a place. Passes appear the same way: a cross-domain
cord that settles leaves a saddle between two ranges, and from then on the
ranges are one landform. Open questions are the one thing that never settles.
They are drawn as searching tips that keep growing, very slowly, into the
fog. The system runs as a time-lapse from the first week to the present and
then rests, with only the live tips still faintly moving. It is a living
picture, and it is never a restless one.

Color is a single warm paper and a small family of muted domain hues: ochre,
teal, rose, slate, moss, copper. Threads carry their domain's hue at full
saturation only while luminous. Cords made across domains carry a mix. Ground
carries the hue only as a tint on the hypsometric ramp, so that a settled
landscape is mostly paper and contour ink with the faintest memory of what
color the learning was. Every parameter of this palette was refined through
countless iterations until the sparse state and the dense state belong to the
same world. Every seed produces a different history and the same movement.

### The conceptual seed

Noesis is Husserl's word for the act of thinking, as distinct from the noema,
the thing thought. The picture honors the name by never drawing the noema. No
concept is ever marked. Only acts are drawn: threads for the act of
explaining, cords for the act of connecting, ground for the act of having held
something long enough that it became part of you. Someone who knows the word
will notice that the map has no places on it, only the marks of having been
there. Everyone else will see a landscape with something growing on it.

A second, quieter seed: hyphal branching in the sketch uses the golden angle,
so colonies carry the same divergence as a sunflower head, and no one will
be able to say why they look settled.

## What the sketch demonstrates

`viewer.html` runs the grammar on a synthetic learning history. Its
parameters are learning-shaped rather than art-shaped: how many concepts were
learned, across how many domains, over how many months, how deeply on
average, how often the explanations bridged domains, and how many questions
are still open. The seed generates a history. Changing the depth slider with
the seed held fixed is the most useful experiment: it shows the same concepts
learned shallowly and learned well, and the difference is the entire product
thesis.

The sketch is not wired to the database. The mapping from real tables to the
synthetic history is one function, and it is the first thing to build when the
grammar is adopted.

## What this grammar does not yet answer

- **Semantic position.** Domain clusters in the sketch are placed at random
  with a minimum spacing. In the app, position should come from embeddings
  of concept descriptions, which the original spec already earmarked as a
  learning project.
- **Scale.** The sketch caps around eighty concepts. A year of weekly learning
  is fifty. Three years is a hundred and fifty, and the map will need to zoom
  or the contour interval will need to grow with the tallest peak.
- **Applied.** The spec's Applied state, building something from a concept,
  is the strongest form of retention and deserves its own mark. Nothing in
  this grammar claims it yet. A candidate is a structure on the land: the one
  built thing a landscape can hold that nature did not put there.

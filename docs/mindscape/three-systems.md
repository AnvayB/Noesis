# Three Mindscape systems on one learning history

Design note for `three-systems.html`, an experimental comparison of three
visual environments for the Mindscape. All three render the same
hand-authored twelve-month learning history, so the comparison is fair, and
all three share one determinism model, so a person's Mindscape is
recognizably theirs in any of them.

This is not production UI. It is the experiment that decides which two or
three environments are worth building, and it exists because the earlier
grammar work concluded that the reading has to be learnable and the same
across renderings. Settling Ground, from `visual-grammar.md`, is the
reference grammar. The three systems here are the same grammar in three
weathers.

## The shared dataset

Twenty-eight concepts in four fields, learned over twelve months. The fields
were chosen to be unlike each other so bridges between them mean something:
machine learning, chip design, music theory, and the science of memory.

The history contains every event the mechanisms need:

| Mechanism | What is in the data |
|---|---|
| Growth | New concepts appear in every month from one to twelve. Two are only ever encountered. |
| Strengthening | Several concepts are explained three or four times. Transformers is explained in months two, three, six and nine. |
| Retention | Eleven concepts reach Retained at a recorded month. |
| Bridges | Five cross-field connections, one every month or so from month six: attention to working memory, harmonics to embeddings, memory hierarchy to working memory, network-on-chip to mixture of experts, predictive processing to transformers. |
| Weak knowledge | Three concepts fail a recall and are never re-explained: backprop in month six, counterpoint in month eight, cache coherence in month nine. |
| Continuity | The month slider replays the same history. Nothing that was drawn in month four is anywhere else in month twelve. |

## The determinism model

Two different things are usually confused under "random", and the sketch
keeps them apart.

**Identity is hashed.** Every position comes from a hash of the concept's
stable id together with the personal seed. Adding a twenty-ninth concept
cannot move the other twenty-eight. Related concepts are pulled a fixed
fraction toward each other after hashing, and that pull is also a pure
function of the ids. The personal seed is the one input that changes a whole
map: it is the person, not the day.

**Variation is noise.** Branch curvature, contour relief, halo irregularity,
leaf placement: everything organic comes from seeded noise sampled at the
identity-derived positions. The variation slider scales the amplitude and
never changes what is where. At zero the maps become diagrams. At one they
become weather. The same knowledge state always produces the same picture,
and two people with identical histories still get two different pictures.

## Three environments

### Grove

Each field is a tree. The trunk grows by a fixed amount for every concept
learned, so branches never move once placed: a concept learned in month
three attaches at the same height forever. A branch's length is depth of
understanding, its thickness is revisits, and re-explaining adds twigs
rather than length. Retained concepts put out foliage in the field's hue. A
concept only encountered is a bud on a stub. A bridge is a tendril arcing
from one tree's branch to another's, with a small flower at the join.

Weak knowledge is winter: the branch stays, goes pale, drops its leaves, and
droops a little. It is not damage. It is a season, and a season is not ugly.

### Sky

Each field is a region of sky. Concepts are stars at hashed positions.
Magnitude is depth, revisits widen the halo, and retention adds diffraction
spikes and a nebula of the field's hue that accumulates around retained
stars until a well-learned field glows as a whole. Constellation lines are
earned: they are drawn between related stars only once both have been
explained, and brighten when both are retained. A bridge is a light bridge,
a gradient filament between two regions with a ring at each end.

Weak knowledge is a red dwarf: the star cools, shrinks, loses its halo, and
stays exactly where it was. An old sky is not uglier for having a few of
them. It is truer.

### Ground

Each field is a range. Concepts deposit height, revisits raise it, retention
widens the footprint and, above a threshold, snow-caps the peak. Related
concepts in a field are joined by low ridges into a massif. A bridge is a
pass: a saddle of raised ground between two ranges, marked by a cairn. A
concept only encountered is a survey marker on flat ground.

Weak knowledge is mist. The land is not eroded, because land does not erode
here, but the hue drains from its slopes and a patch of fog settles on it.
Mist in a valley is one of the more beautiful things a map can hold.

## The mechanisms, side by side

| | Grove | Sky | Ground |
|---|---|---|---|
| New concept | A branch on the trunk, higher than the last | A new star in its region | A new peak, or a marker if only met |
| Revisited | Thicker branch, more twigs | Wider halo | Higher peak |
| Retained | Foliage | Spikes and nebula | Wider footprint, snow |
| Bridge | Tendril and flower | Light bridge with rings | Pass with a cairn |
| Weak | Pale, bare, drooping branch | Small warm red star | Fog patch, hue drained |
| Continuity | Fixed attach heights | Fixed positions | Additive heightfield |
| Recent | Glow at the tip | Bright ring | Ring at the summit |

## What the comparison is for

Three questions the sketch is meant to answer by looking, in this order.

1. Which environment makes a weak concept look like a season and which makes
   it look like a mistake? That decides whether the environment can be
   trusted with the no-decay rule.
2. Which environment makes a bridge look like the biggest thing that
   happened that month? That is the moment the product analyses said matters
   most.
3. Which environment is still beautiful at month two, when the map is nearly
   empty? An environment that only works when full will lose the user before
   it fills.

The Grove is the most legible and the most likely to read as a count. The
Sky is the most beautiful when empty and the least able to show
relationships without lines. The Ground is the most permanent and the
quietest. A fourth environment, an atomic or particle system, was left out
of this round because it has no natural form for permanence; if it is built,
its retained state needs an answer to that first.

## Algorithmic philosophy: Three Weathers

Three Weathers is a movement about one history told in three climates. The
history is fixed and the climates are not. Every mark in every climate is
the residue of the same act, drawn once and never moved: a branch, a star, a
peak are three names for one explanation. The movement lives in the
constraint that nothing may be legible in one climate and invisible in
another. If the grove shows a bridge, the sky and the ground must show it
too, in their own weather, at the same size in the mind.

Identity is a hash and weather is a noise field, and the movement insists on
the difference. Positions are computed from names, so that a concept is
where it is because of what it is, and no later learning can displace it.
Everything that varies, the curve of a branch, the grain of a contour, the
softness of a halo, is sampled from seeded noise at those fixed positions,
so that variation decorates the structure and never becomes it. This
separation is a meticulously crafted decision: the noise octaves, the
amplitude scaling, and the relation pull were tuned together until a map
with three concepts and a map with three hundred both look like they were
always going to be this shape.

Each climate grows only by addition. The trunk only lengthens. The nebula
only thickens. The heightfield only rises. Weakness is expressed as a change
of state that removes nothing: leaves fall, a star cools, mist settles. The
product of deep computational expertise here is the tuning of those three
states so that each is quieter than the healthy state around it and none is
uglier. A map full of winter branches, red dwarfs, and mist should still be
a map someone wants on their wall.

Bridges are the one event allowed to be loud. A tendril with a flower, a
filament of light, a pass with a cairn: each climate spends its single
strongest mark on the moment two fields became one, and each is built by a
master-level implementation of the same idea, a path drawn between two
identity-hashed points with a mark at the join. Every seed produces a
different person. Every month produces the same person, older. The
algorithm is finished when a viewer can switch climates and recognize their
own history in each without being told which is which.

The conceptual seed is quiet: the four fields in the sample history are the
four things the creator of Noesis was actually learning when the product
was specified, and the bridges between them are the ones the specification
hoped would be found.

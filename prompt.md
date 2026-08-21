I want you to help me design and build a personal learning application. This is not meant to be a generic productivity tracker, flashcard app, or course platform.

The core idea is:

> **The work I do while learning should gradually create a unique visual artifact that reflects what I have actually encountered, understood, explained, applied, and retained.**

I want the application itself to become a long-running project that evolves as I learn more about AI, LLMs, software engineering, and related topics.

## IMPORTANT: START IN PLAN MODE

Do **not** immediately start coding the full application.

First:

1. Understand the product philosophy and requirements below.
2. Identify the smallest useful V1.
3. Propose the architecture and data model.
4. Separate:

   * features necessary for V1,
   * features we should architect for but postpone,
   * features that I can deliberately implement later as learning projects.
5. Point out unnecessary complexity.
6. Ask questions only where an answer materially changes the architecture.
7. Give me a staged implementation plan.
8. Wait for me to approve or modify the plan before making major implementation changes.

A major principle of this project is that **we should intentionally NOT build every advanced feature immediately**. Some features should become future implementation opportunities after I learn the relevant technology.

---

# 1. Product Philosophy

I often save videos, articles, NotebookLM resources, podcasts, tutorials, and other material about AI/LLMs/software engineering, but I do not always have the motivation to work through them.

I want this application to turn learning into something intrinsically interesting.

Instead of:

* streaks,
* XP,
* badges,
* generic progress bars,
* arbitrary gamification,

I want my learning activity to gradually create an evolving piece of generative/abstract art.

The artwork should not merely represent "hours studied."

It should attempt to represent my **knowledge landscape**.

The long-term goal is that, months later, I could look at the visualization and see a unique visual history of what I have learned.

---

# 2. Core Learning Loop

The fundamental loop should eventually be:

**Consume → Recall → Explain → Feedback → Apply → Revisit → Retain**

Not every session has to contain every stage.

## Consume

I learn from something such as:

* YouTube video
* podcast
* NotebookLM resource
* article
* documentation
* research paper
* course
* coding tutorial
* conversation
* book/chapter
* hands-on experimentation

I should be able to create a Learning Session and associate it with:

* title
* topic
* resource/source
* learning mode
* date
* optional duration
* optional notes

---

# 3. Learning Modes

I want learning environment and learning activity treated as separate concepts.

## Environment / Presentation Mode

### Listen Mode

For material where the information is primarily verbal.

Example:

* listen to an AI podcast or lecture while playing GTA, Minecraft, Forza, etc.

I personally often retain spoken information better when I have something visually stimulating happening simultaneously, provided the educational material does not require me to watch diagrams/code/visuals.

Do NOT treat this as an inferior or "passive" mode.

### Focus Mode

For material requiring visual or interactive attention.

Examples:

* code walkthroughs
* transformer diagrams
* mathematical explanations
* implementation tutorials
* notebooks
* programming
* visual demonstrations

## Activity Dimension

Separately classify an activity roughly as:

**Consume ↔ Practice**

Examples:

* Listen + Consume = podcast while gaming
* Focus + Consume = transformer lecture
* Focus + Practice = implementing attention
* Listen + Practice could include verbally explaining a concept

The application should eventually be able to learn which environments work best for me for different kinds of material.

---

# 4. Explain-Back / Active Recall

This is one of the MOST IMPORTANT features.

After learning something, I want the application to ask me to explain it back in my own words.

Example instruction:

> Explain what you just learned as if you were explaining it to a friend who understands the basics but has not learned this specific topic.

I should be able to respond through:

* text
* voice

Voice should be treated as a first-class feature, even if V1 initially uses browser speech recognition or a simple transcription implementation.

During the explanation, the app should NOT constantly interrupt or correct me.

After I finish, an LLM can evaluate:

* concepts correctly explained
* concepts partially understood
* important omissions
* misconceptions
* factual inaccuracies
* depth of understanding
* clarity of explanation
* relevant connections to previous knowledge

Do not reduce this to a single meaningless numeric score.

Store useful structured information.

---

# 5. Personal Knowledge Model

Over time, the system should maintain an evolving model of what I know.

A concept might have states such as:

**Encountered → Familiar → Understood → Can Explain → Applied → Retained**

These states should not necessarily be implemented as rigid boolean milestones. Feel free to propose a better model.

Example internal concept:

Topic: Mixture of Experts

Possible information:

* first encountered
* last encountered
* learning sources
* related concepts
* concepts I explained correctly
* concepts I struggled with
* unresolved questions
* explain-back history
* application/project history
* recall history
* confidence/mastery estimate
* last reviewed
* whether I have retained it after time has passed

I want the app to distinguish between:

> "I have seen this before"

and

> "I can explain this from memory."

---

# 6. Casual Quizzing

I do NOT want this to feel like Anki or a formal test system.

The app should sometimes casually bring up previous concepts.

Example:

> Quick one — why can a Mixture-of-Experts model have a very large total parameter count while activating far fewer parameters for a particular token?

The app should prioritize things such as:

* concepts not revisited recently
* concepts I previously struggled with
* foundational concepts connected to newer learning
* concepts that may be approaching an appropriate recall interval
* interesting connections between topics

The interaction should feel more like:

> "You learned this a few days ago. Do you remember why this happens?"

rather than:

> QUIZ 4/10 — SCORE: 72%

My response should update the knowledge model.

---

# 7. Generative Knowledge Artwork

The application should create an evolving abstract/procedural visual representation of my learning.

This visual component is extremely important.

However, I do NOT necessarily want AI image generation producing unrelated PNG images.

I am more interested in a continuously evolving procedural visualization using technology such as:

* Three.js
* WebGL
* Canvas
* SVG
* p5.js
* D3
* or another appropriate approach

Please recommend the best choice.

Possible conceptual mappings:

* time spent learning → growth
* encountering a topic → new structure appears
* related topic → structure grows near/connects to previous topic
* written notes → added detail
* successful explain-back → structure becomes more defined
* applying concept → major structural development
* later successful recall → structure strengthens
* long-term retention → structure becomes permanent/stable
* unresolved question → unfinished or ambiguous element
* resolved question → connection/completion
* forgotten/weak topic → fades or becomes less defined

These examples are inspiration, not rigid requirements.

I want you to help design a coherent visual grammar.

The visualization should become unique to my actual learning history.

---

# 8. Semantic Knowledge Landscape

Eventually, related concepts should naturally organize themselves.

Example:

AI
→ LLMs
→ Transformers
→ Attention
→ Embeddings
→ Retrieval
→ RAG

However, we should NOT necessarily implement sophisticated semantic positioning immediately.

This is actually an excellent example of a future learning project.

For example:

After I learn embeddings, the app could recommend:

> Improve this app by using embeddings to position semantically related concepts near each other.

That leads into one of the most important features below.

---

# 9. Apply What I Learned

After learning and explaining a concept, the app should sometimes recommend a small project that lets me actually use it.

Examples:

After learning embeddings:

> Build semantic positioning for the application's knowledge visualization.

After learning RAG:

> Build "Ask My Knowledge" using my stored learning history.

After learning clustering:

> Automatically discover topic clusters in my knowledge graph.

After learning speech-to-text:

> Improve the explain-back transcription system.

After learning local inference:

> Move appropriate analysis workloads to a local model.

After learning agents:

> Create an agent that identifies gaps in my knowledge and recommends what I should revisit.

The application itself should therefore gradually become more sophisticated as my AI knowledge becomes more sophisticated.

This is a key product philosophy:

> **The application becomes a living portfolio of my technical growth.**

---

# 10. Standalone Mini-Projects

Do NOT force every concept into this application.

The recommendation system should ask internally:

> Can this concept meaningfully improve the learning app?

If yes:

**Improve This App**

If no:

**Standalone Mini-Project**

Example:

If I learn computer vision and there is no meaningful application inside the learning system, it might suggest:

> Build a small webcam posture detector using pose estimation.

The point is to practice the concept, not artificially insert every technology into one codebase.

---

# 11. Progressive Help System

When the app recommends a project, it should NOT immediately generate the entire finished solution.

I want progressive assistance.

Possible levels:

1. **Challenge**

   * describe what I should build
   * explain the desired result

2. **Hint**

   * small conceptual push

3. **Bigger Hint**

   * more architectural direction

4. **Steps**

   * step-by-step implementation plan

5. **Implementation Help**

   * detailed help/code for the specific part where I am stuck

The default should encourage me to think first.

Avoid the common AI-learning failure mode where the assistant generates 200 lines of working code and I learn almost nothing.

---

# 12. Project Duration Options

Recommended practice projects could eventually be scoped by time:

* ~10–15 minutes
* ~30 minutes
* ~1 hour
* ~1–2 hours
* larger project

The app should try to adapt difficulty to my apparent understanding.

---

# 13. Learning Profile / Personal Analytics

Eventually, after enough sessions, I want the app to identify patterns in how I learn.

Example:

Listen + Gaming
Immediate recall: strong
Long-term retention: moderate/strong

Focused Video
Immediate recall: moderate
Long-term retention: strong

Hands-On Implementation
Immediate recall: very strong
Long-term retention: very strong

These should NOT be presented as scientifically precise cognitive measurements.

They are personal behavioral signals based on my own history.

The app could eventually identify patterns like:

> You retain conceptual AI discussions particularly well while listening during gaming, but implementation-heavy subjects are retained better when you actively follow the code.

This feature does not need to exist in V1, but architecture should not make it impossible.

---

# 14. unprompted.cool Integration

I use:

**https://unprompted.cool**

as a way of practicing spontaneous speaking.

For the first version, I think a simple external hyperlink is enough.

Potential UI:

## Practice Speaking

### From My Knowledge

The app creates a speaking prompt based on something I have learned.

Examples:

* Explain RAG to a nontechnical person.
* Explain why a larger context window is not identical to long-term memory.
* Argue whether AI agents are currently more useful than conventional automation.
* Compare embeddings and keyword search.
* Explain a topic you have not revisited recently.

### Random Topic

Open unprompted.cool.

Do NOT spend significant development effort attempting to deeply integrate unprompted.cool unless there is a compelling reason.

Our application's personalized speaking prompts are ultimately more important because the system understands my knowledge history.

---

# 15. Topic Inbox / Things I Want to Learn

I will frequently discover interesting topics while:

* gaming
* watching videos
* listening to podcasts
* browsing
* talking to people

I want an extremely low-friction way to save:

> Learn about Mixture of Experts.

or

> Look into MCP.

or

> Understand speculative decoding.

These should enter some kind of:

**Learning Inbox / Curiosity Queue**

Later, the app can remind me that I wanted to investigate them.

Potentially, unexplored topics could appear in the visualization differently from learned topics.

For example:

* faint nodes
* distant lights
* unfinished structures
* fogged regions

Do not overbuild this metaphor in V1.

---

# 16. Resource Tracking

For a topic/session I should eventually be able to associate:

* YouTube URL
* article URL
* podcast
* NotebookLM notebook/resource
* paper
* documentation
* uploaded notes
* manually entered source

The system should remember where I learned something.

Do not build a full content ingestion/RAG pipeline in V1 unless justified.

Manual metadata + notes is acceptable initially.

---

# 17. LLM Usage

Use an LLM where semantic reasoning provides real value, including potentially:

* extracting concepts from explain-backs
* identifying misconceptions
* identifying relationships
* generating casual recall questions
* recommending small projects
* adapting project difficulty
* generating progressive hints
* suggesting speaking prompts
* summarizing learning history
* identifying weak areas

Avoid using an LLM for things deterministic software can handle better.

Please propose clean structured outputs for LLM calls rather than depending on prose parsing.

---

# 18. Future AI Features I WANT TO LEARN BY IMPLEMENTING MYSELF

This is extremely important.

When planning the architecture, deliberately identify features that can remain simple initially and later become implementation projects.

Possible examples:

## Embeddings

Upgrade semantic concept similarity.

## Vector Databases

Upgrade knowledge retrieval.

## RAG

Build Ask My Knowledge.

## Clustering

Discover concept families automatically.

## Knowledge Graphs

Represent richer relationships.

## Speech Recognition

Improve voice explain-backs.

## Local LLMs

Move some analysis to my gaming computer.

## Agents

Identify learning gaps and autonomously suggest next actions.

## Recommendation Systems

Improve personalized project/topic suggestions.

## Evaluation

Evaluate whether explain-back scoring and quiz generation are actually reliable.

## Spaced Repetition

Improve timing of casual recall.

Do not preemptively implement all of these.

---

# 19. Potential V1

I currently imagine V1 might be something like:

* React/Vite web app
* simple persistent local database/storage
* dashboard/home
* create Learning Session
* select Listen or Focus
* record resource/topic
* optional timer
* end session
* explain back through text
* possibly basic voice transcription
* LLM extracts structured concepts
* store concepts and relationships
* update a simple procedural visualization
* concept detail view
* basic learning history
* simple Learning Inbox / Curiosity Queue

I am NOT committed to this architecture.

Evaluate it.

I want the smallest version that lets me experience the central loop:

**Learn something → explain it → system understands what I learned → knowledge artwork visibly changes.**

That is the V1 magic moment.

---

# 20. Technical Preferences

I am comfortable with software development and AI concepts, but I want this project itself to help me learn.

Prefer:

* understandable architecture
* modularity
* clean code
* good separation of concerns
* easy local development
* avoiding unnecessary infrastructure
* avoiding premature cloud architecture
* avoiding unnecessary authentication if this is initially personal/local
* keeping future migration possible

I would likely prefer TypeScript for the frontend/application layer.

React + Vite is a reasonable default.

You may recommend:

* localStorage
* IndexedDB
* SQLite
* Supabase
* Postgres
* another storage solution

but justify the complexity.

For V1, prioritize getting the concept working locally.

---

# 21. UX Philosophy

The application should feel:

* exploratory
* creative
* calm
* intellectually interesting
* visually rewarding
* personal

It should NOT feel like:

* corporate LMS software
* school homework
* Jira
* Anki
* habit tracker
* productivity guilt dashboard
* Duolingo clone

Avoid excessive:

* streaks
* red warning indicators
* "you failed to study today"
* arbitrary scores
* gamification noise

The motivation should primarily come from:

1. curiosity,
2. creation,
3. seeing my knowledge evolve,
4. discovering connections,
5. practicing ideas,
6. watching the application itself improve.

---

# 22. What I Want From You RIGHT NOW

Stay in Plan Mode.

Before coding, produce:

## A. Product interpretation

Explain what you believe the core product is and what makes it unusual.

## B. V1 definition

Identify the absolute minimum feature set needed to produce the central experience.

## C. User flow

Walk through one realistic session from opening the app to seeing the artwork change.

## D. Architecture

Recommend:

* frontend
* backend if necessary
* storage
* LLM integration
* voice input approach
* visualization approach
* data flow

## E. Data model

Propose initial models for things such as:

* LearningSession
* Resource
* Topic/Concept
* ExplainBack
* ConceptUnderstanding
* RecallAttempt
* Project
* CuriosityItem
* Artwork state

Avoid over-modeling.

## F. LLM contracts

Show the important structured inputs/outputs we should eventually use for:

* explain-back analysis
* casual quiz generation
* project generation

## G. Visualization system

Propose a simple but expandable visual grammar.

Explain how knowledge events should cause visible changes.

## H. V1 vs Later

Create three categories:

**Build Now**

**Architect For**

**Deliberately Leave for Me to Learn and Implement Later**

The third category is especially important.

## I. Implementation phases

Break development into small phases where each phase leaves us with a working application.

## J. Risks

Identify where this project could become:

* overengineered,
* annoying to use,
* too dependent on manual logging,
* visually meaningless,
* LLM-cost-heavy,
* or so automated that I stop actually learning.

## K. Recommended starting point

Tell me exactly what you would build first after I approve the plan.

Do not generate the entire application yet.

The purpose of Plan Mode is to make sure we preserve the philosophy of this project before implementation begins.

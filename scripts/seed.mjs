// Realistic demo history for trying the app: several fields, concepts with
// depth, revisits, cross-field bridges, settled knowledge, open questions,
// and unfinished sessions. Writes to DATABASE_PATH (default ./noesis.db).
//
//   DATABASE_PATH=./noesis.demo.db node scripts/seed.mjs        # add demo data
//   DATABASE_PATH=./noesis.demo.db node scripts/seed.mjs --clear  # wipe learning data
//
// Nothing here is special-cased by the app; it is ordinary rows.

import { createClient } from "@libsql/client";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { readFileSync, readdirSync } from "node:fs";

const dbPath = process.env.DATABASE_PATH ?? "./noesis.db";
const db = createClient({ url: `file:${path.resolve(dbPath)}` });

const TABLES = [
  "explain_back_relations", "explain_back_concepts", "concept_understandings", "explain_backs",
  "recall_attempts", "concept_relations", "session_concepts", "weekly_focus",
  "learning_sessions", "curiosity_items", "resources", "concepts",
];

async function migrate() {
  // Apply the drizzle migrations directly so a fresh file works without the app.
  await db.execute(`CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (id INTEGER PRIMARY KEY AUTOINCREMENT, hash text NOT NULL, created_at numeric)`);
  const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
  const applied = (await db.execute(`SELECT created_at FROM "__drizzle_migrations" ORDER BY created_at DESC LIMIT 1`)).rows[0]?.created_at ?? 0;
  for (const entry of journal.entries) {
    if (entry.when <= Number(applied)) continue;
    const sql = readFileSync(`drizzle/${entry.tag}.sql`, "utf8");
    for (const stmt of sql.split("--> statement-breakpoint")) {
      const t = stmt.trim();
      if (t) await db.execute(t);
    }
    await db.execute({ sql: `INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES (?, ?)`, args: [entry.tag, entry.when] });
  }
  void readdirSync;
}

const now = Date.now();
const DAY = 86400000;
const ts = (daysAgo, hour = 19) => {
  const d = new Date(now - daysAgo * DAY);
  d.setUTCHours(hour, 12, 0, 0);
  return d.toISOString().slice(0, 19).replace("T", " ");
};
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const conceptIds = new Map();
async function concept(name, field, firstDaysAgo, lastDaysAgo = firstDaysAgo) {
  if (conceptIds.has(name)) return conceptIds.get(name);
  const id = randomUUID();
  await db.execute({
    sql: `INSERT INTO concepts (id, name, slug, field, first_encountered_at, last_encountered_at, created_at) VALUES (?,?,?,?,?,?,?)`,
    args: [id, name, slug(name), field, ts(firstDaysAgo), ts(lastDaysAgo), ts(firstDaysAgo)],
  });
  conceptIds.set(name, id);
  return id;
}

async function resource({ type, url, title, byline, excerpt }) {
  const id = randomUUID();
  await db.execute({
    sql: `INSERT INTO resources (id, type, url, title, byline, excerpt, word_count) VALUES (?,?,?,?,?,?,?)`,
    args: [id, type, url ?? null, title, byline ?? null, excerpt ?? null, excerpt ? excerpt.split(/\s+/).length : null],
  });
  return id;
}

async function session({ title, concept: name, field, daysAgo, status = "completed", resource: res = null, notes = null, envMode = "focus" }) {
  const id = randomUUID();
  const resourceId = res ? await resource(res) : null;
  const conceptId = await concept(name, field, daysAgo, daysAgo);
  await db.execute({
    sql: `INSERT INTO learning_sessions (id, title, resource_id, environment_mode, activity_mode, status, started_at, ended_at, notes, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    args: [id, title, resourceId, envMode, "consume", status, ts(daysAgo), status === "completed" ? ts(daysAgo, 20) : null, notes, ts(daysAgo)],
  });
  await db.execute({ sql: `INSERT INTO session_concepts (session_id, concept_id, role) VALUES (?,?,?)`, args: [id, conceptId, "primary"] });
  return id;
}

async function relation(a, b, source, description, strength = 1, daysAgo = 0) {
  const id = randomUUID();
  await db.execute({
    sql: `INSERT INTO concept_relations (id, from_concept_id, to_concept_id, relation_type, source, description, strength, created_at) VALUES (?,?,?,?,?,?,?,?)`,
    args: [id, conceptIds.get(a), conceptIds.get(b), "related", source, description, strength, ts(daysAgo)],
  });
  return id;
}

async function explain({ sessionId, daysAgo, text, depth, clarity = "reasonable", concepts: addressed, connections = [], omissions = [], misconceptions = [], gist, level, nextStep, followUp = null, relations = [] }) {
  const id = randomUUID();
  await db.execute({
    sql: `INSERT INTO explain_backs (id, session_id, input_mode, raw_text, created_at) VALUES (?,?,?,?,?)`,
    args: [id, sessionId, "text", text, ts(daysAgo, 20)],
  });
  await db.execute({
    sql: `INSERT INTO concept_understandings (id, explain_back_id, depth, clarity, omissions, misconceptions, connections_made, follow_up_question, gist, level, next_step, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [randomUUID(), id, depth, clarity, JSON.stringify(omissions), JSON.stringify(misconceptions), JSON.stringify(connections), followUp, gist, level, nextStep, ts(daysAgo, 20)],
  });
  for (const [name, status] of addressed) {
    await db.execute({ sql: `INSERT INTO explain_back_concepts (explain_back_id, concept_id, status) VALUES (?,?,?)`, args: [id, conceptIds.get(name), status] });
    if (status === "correct") await db.execute({ sql: `UPDATE concepts SET last_reviewed_at = ? WHERE id = ?`, args: [ts(daysAgo, 20), conceptIds.get(name)] });
  }
  for (const [relId, kind] of relations) {
    await db.execute({ sql: `INSERT INTO explain_back_relations (explain_back_id, relation_id, kind) VALUES (?,?,?)`, args: [id, relId, kind] });
  }
  return id;
}

async function recall(name, daysAgo, outcome, prompt) {
  await db.execute({
    sql: `INSERT INTO recall_attempts (id, concept_id, triggered_by, prompt, expected_key_points, response, outcome, created_at, answered_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    args: [randomUUID(), conceptIds.get(name), "casual_quiz", prompt, "[]", null, outcome, ts(daysAgo, 9), ts(daysAgo, 9)],
  });
  await db.execute({ sql: `UPDATE concepts SET last_reviewed_at = ? WHERE id = ?`, args: [ts(daysAgo, 9), conceptIds.get(name)] });
}

async function clear() {
  for (const t of TABLES) await db.execute(`DELETE FROM ${t}`);
  console.log("cleared learning data in", dbPath);
}

async function seed() {
  // --- Machine learning: deep, revisited, settled --------------------------
  const ML = "Machine learning";
  const attention1 = await session({
    title: "Attention in transformers, explained visually", concept: "Attention", field: ML, daysAgo: 96,
    resource: { type: "youtube", url: "https://www.youtube.com/watch?v=eMlx5fFNoYc", title: "Attention in transformers, step-by-step", byline: "3Blue1Brown" },
  });
  await concept("Softmax", ML, 96, 96);
  await concept("Embeddings", ML, 96, 40);
  await explain({
    sessionId: attention1, daysAgo: 96, depth: "solid", level: 3,
    text: "Each token asks a question with a query vector, every other token answers with a key, and the match decides how much of each value gets mixed in. Softmax turns the matches into weights that sum to one.",
    concepts: [["Attention", "correct"], ["Softmax", "correct"], ["Embeddings", "partial"]],
    connections: [{ from: "Attention", to: "Softmax", description: "softmax turns raw match scores into mixing weights" }],
    omissions: ["Why the dot products are scaled by the square root of the key dimension."],
    gist: "Attention is every token asking every other token how relevant it is, then averaging by the answers.",
    nextStep: "Explain what goes wrong without the scaling factor when the key dimension is large.",
    followUp: "Why do transformers need several attention heads instead of one?",
  });
  const r1 = await relation("Attention", "Softmax", "explained", "softmax turns raw match scores into mixing weights", 2, 96);
  await relation("Attention", "Embeddings", "llm_inferred", null, 1, 96);

  const attention2 = await session({
    title: "Multi-head attention, from the paper", concept: "Attention", field: ML, daysAgo: 71,
    resource: { type: "paper", url: "https://arxiv.org/abs/1706.03762", title: "Attention Is All You Need", byline: "Vaswani et al." },
  });
  await concept("Multi-head attention", ML, 71);
  await explain({
    sessionId: attention2, daysAgo: 71, depth: "deep", clarity: "very_clear", level: 4,
    text: "Several heads let the model attend to different relations at once: one head might track syntax, another coreference. Each head is a smaller attention with its own projections, and the outputs are concatenated. The scaling by root of d_k keeps the dot products from saturating softmax.",
    concepts: [["Attention", "correct"], ["Multi-head attention", "correct"], ["Softmax", "correct"]],
    connections: [{ from: "Multi-head attention", to: "Attention", description: "a head is a small attention with its own projections" }],
    gist: "Heads are parallel small attentions, each free to specialise, glued back together by concatenation.",
    nextStep: "Work through what the output projection after concatenation is for.",
    relations: [[r1, "strengthened"]],
  });
  await relation("Multi-head attention", "Attention", "explained", "a head is a small attention with its own projections", 1, 71);
  await recall("Attention", 55, "remembered", "Quick one: what do the query and key vectors actually do?");
  await recall("Softmax", 50, "remembered", "Why does softmax make attention weights sum to one?");

  const emb = await session({
    title: "What are embeddings, really?", concept: "Embeddings", field: ML, daysAgo: 40,
    resource: { type: "article", url: "https://jalammar.github.io/illustrated-word2vec/", title: "The Illustrated Word2vec", byline: "Jay Alammar", excerpt: "Embeddings are vectors learned so that words used in similar contexts land near each other.\n\nThe classic example is that king minus man plus woman lands near queen. The geometry carries meaning because the training objective rewards predicting neighbours." },
  });
  await explain({
    sessionId: emb, daysAgo: 40, depth: "solid", level: 3,
    text: "An embedding is a learned vector where nearness means the words show up in similar contexts. The famous king minus man plus woman lands near queen. It's also what harmonics do in a chord: notes that belong together sit close.",
    concepts: [["Embeddings", "correct"]],
    connections: [{ from: "Embeddings", to: "Harmonics", description: "both place things near each other when they belong together" }],
    gist: "Embeddings are geometry that learned to mean something: near is similar.",
    nextStep: "Explain why the training objective, not the architecture, is what gives the geometry its meaning.",
  });

  const moe = await session({
    title: "Mixture of experts in one video", concept: "Mixture of experts", field: ML, daysAgo: 12,
    resource: { type: "youtube", url: "https://www.youtube.com/watch?v=sOPDGQjFcuM", title: "Mixture of Experts, explained", byline: "Yannic Kilcher" },
  });
  await concept("Routing", ML, 12);
  await explain({
    sessionId: moe, daysAgo: 12, depth: "surface", level: 2,
    text: "Instead of one big feed-forward block, there are many experts and a router picks a couple for each token. So the model can be huge but each token only uses a bit of it.",
    concepts: [["Mixture of experts", "correct"], ["Routing", "partial"]],
    omissions: ["How load balancing keeps a few experts from taking all the traffic.", "Why the router is trained with an auxiliary loss."],
    misconceptions: [{ description: "Experts are not each specialised to a topic in any human-readable way; routing is learned and often opaque.", concept: "Routing" }],
    gist: "MoE is a big model that only wakes up a few parts per token.",
    nextStep: "Find out what happens to training when the router keeps choosing the same two experts.",
    followUp: "How does the router avoid sending everything to the same expert?",
  });
  await relation("Mixture of experts", "Routing", "llm_inferred", null, 1, 12);
  await relation("Mixture of experts", "Attention", "llm_inferred", null, 1, 12);

  // --- Music theory: a second field, one bridge to ML ----------------------
  const MU = "Music theory";
  const harm = await session({
    title: "Harmonics and why chords sound consonant", concept: "Harmonics", field: MU, daysAgo: 60,
    resource: { type: "youtube", url: "https://www.youtube.com/watch?v=Wx_kugSemfY", title: "Why do chords sound good?", byline: "Adam Neely" },
  });
  await concept("Overtone series", MU, 60);
  await concept("Consonance", MU, 60);
  await explain({
    sessionId: harm, daysAgo: 60, depth: "solid", level: 3,
    text: "A vibrating string produces a stack of overtones at integer multiples of the fundamental. Intervals whose overtones line up sound consonant because there's less beating between nearby partials.",
    concepts: [["Harmonics", "correct"], ["Overtone series", "correct"], ["Consonance", "partial"]],
    connections: [{ from: "Consonance", to: "Overtone series", description: "consonance is overlap in the overtone series" }],
    gist: "Consonance is two overtone stacks agreeing with each other.",
    nextStep: "Explain why equal temperament makes every interval slightly out of tune.",
  });
  await relation("Consonance", "Overtone series", "explained", "consonance is overlap in the overtone series", 1, 60);
  await relation("Embeddings", "Harmonics", "explained", "both place things near each other when they belong together", 1, 40);
  await recall("Harmonics", 30, "remembered", "What makes a fifth sound consonant?");

  const cp = await session({
    title: "Counterpoint, first species", concept: "Counterpoint", field: MU, daysAgo: 24,
    resource: { type: "article", url: "https://www.openmusictheory.com/firstSpecies.html", title: "First-species counterpoint", byline: "Open Music Theory" },
  });
  await explain({
    sessionId: cp, daysAgo: 24, depth: "surface", level: 2,
    text: "Note against note. You avoid parallel fifths and octaves, and you prefer contrary motion so the two lines stay independent.",
    concepts: [["Counterpoint", "correct"]],
    omissions: ["Why parallel perfect intervals were avoided in the first place."],
    gist: "Two melodies at once, kept independent by rules about how they move.",
    nextStep: "Say why parallel fifths collapse two voices into one.",
  });
  await recall("Counterpoint", 8, "forgot", "Quick one: which motion does first-species counterpoint prefer?");

  // --- Baking: an unrelated field, met but barely explained ----------------
  const BA = "Baking";
  const sd = await session({
    title: "Sourdough hydration, explained", concept: "Sourdough hydration", field: BA, daysAgo: 18,
    resource: { type: "article", url: "https://www.theperfectloaf.com/what-is-hydration-in-baking/", title: "What is hydration in baking?", byline: "The Perfect Loaf", excerpt: "Hydration is the ratio of water to flour by weight.\n\nA 75% hydration dough has 750 grams of water for every kilogram of flour. Higher hydration gives a more open crumb and a slacker dough that is harder to shape." },
  });
  await explain({
    sessionId: sd, daysAgo: 18, depth: "solid", level: 3,
    text: "Hydration is water divided by flour by weight. Higher means a wetter, slacker dough that's harder to shape but gives an open crumb.",
    concepts: [["Sourdough hydration", "correct"]],
    gist: "Hydration is just water over flour, and it trades shapeability for crumb.",
    nextStep: "Explain what gluten does differently at 65% and at 80%.",
  });
  await concept("Gluten development", BA, 18, 18);
  await relation("Sourdough hydration", "Gluten development", "llm_inferred", null, 1, 18);

  // --- Unfinished and kept -------------------------------------------------
  await session({
    title: "How predictive processing explains perception", concept: "Predictive processing", field: "Cognitive science", daysAgo: 3, status: "started",
    resource: { type: "youtube", url: "https://www.youtube.com/watch?v=Tug2mzt8Vfs", title: "Predictive processing", byline: "Andy Clark" },
    notes: "Perception as controlled hallucination? Precision weighting = how much to trust the error.",
  });
  await session({
    title: "The Illustrated Transformer", concept: "Transformers", field: ML, daysAgo: 6, status: "pending",
    resource: { type: "article", url: "https://jalammar.github.io/illustrated-transformer/", title: "The Illustrated Transformer", byline: "Jay Alammar" },
  });
  await session({
    title: "Roman concrete and why it lasts", concept: "Roman concrete", field: "History of technology", daysAgo: 2, status: "pending",
    resource: { type: "youtube", url: "https://www.youtube.com/watch?v=qz8j1nE8GvE", title: "Why Roman concrete lasts", byline: "Practical Engineering" },
  });
  for (const q of ["Why do transformers need several attention heads instead of one?", "Does equal temperament change how a fifth's overtones line up?"]) {
    await db.execute({ sql: `INSERT INTO curiosity_items (id, text, created_at) VALUES (?,?,?)`, args: [randomUUID(), q, ts(11)] });
  }
  console.log("seeded demo history into", dbPath);
}

await migrate();
if (process.argv.includes("--clear")) await clear();
else await seed();

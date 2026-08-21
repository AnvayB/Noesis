import type { CurriculumModule } from "./types";
import { coreLoopDataModel } from "./modules/01-core-loop-data-model";
import { explainBackAiAbstraction } from "./modules/02-explain-back-ai-abstraction";
import { knowledgeModelConceptGraph } from "./modules/03-knowledge-model-concept-graph";
import { mindscapeVisualization } from "./modules/04-mindscape-visualization";
import { recallRetention } from "./modules/05-recall-retention";
import { practiceSpeaking } from "./modules/06-practice-speaking";
import { howLlmsWork } from "./modules/07-how-llms-work";
import { sessionLifecycle } from "./modules/08-session-lifecycle";
import { learnNoesisSelfStudy } from "./modules/09-learn-noesis-self-study";
import { databaseLayerTursoMigration } from "./modules/10-database-layer-turso-migration";

// Array order = canonical progression order. Adding a future module (e.g.
// once embeddings/RAG/local inference get built) is a new file here plus
// one entry — no migration, no DB change.
//
// Standing practice: any substantial change to this app (a new feature, a
// data-model change, an infra/deployment change) gets a matching module
// added here in the same pass — this curriculum is meant to stay a living
// record of how the app actually works, not a snapshot of V1.
export const CURRICULUM_MODULES: CurriculumModule[] = [
  coreLoopDataModel,
  explainBackAiAbstraction,
  howLlmsWork,
  knowledgeModelConceptGraph,
  mindscapeVisualization,
  recallRetention,
  practiceSpeaking,
  sessionLifecycle,
  learnNoesisSelfStudy,
  databaseLayerTursoMigration,
];

export function getCurriculumModule(slug: string): CurriculumModule | undefined {
  return CURRICULUM_MODULES.find((m) => m.slug === slug);
}

export interface CurriculumPhase {
  phase: string;
  modules: CurriculumModule[];
}

export function listCurriculumPhases(): CurriculumPhase[] {
  const phases: CurriculumPhase[] = [];
  for (const curriculumModule of CURRICULUM_MODULES) {
    const existing = phases.find((p) => p.phase === curriculumModule.phase);
    if (existing) {
      existing.modules.push(curriculumModule);
    } else {
      phases.push({ phase: curriculumModule.phase, modules: [curriculumModule] });
    }
  }
  return phases;
}

export type { CurriculumModule, CurriculumLevelContent, CurriculumLessonSection } from "./types";

import type { ReactElement } from "react";
import {
  ComparisonDiagram,
  FlowDiagram,
  HubSpokeDiagram,
  MeshDiagram,
  NodeGraphDiagram,
} from "./primitives";

// Registry of original diagrams referenced from curriculum module content via
// lesson.diagramId — keeps content files (lib/curriculum/modules/*.ts) free
// of JSX, and keeps every diagram's actual definition in one reviewable
// place. Add a new one here, then reference its key from a module.
export const CURRICULUM_DIAGRAMS: Record<string, ReactElement> = {
  "transistor-to-chip": (
    <FlowDiagram
      steps={["Transistor", "Logic Gate", "Functional Block", "Chip (SoC)"]}
      caption="Transistors combine into gates, gates into functional blocks, blocks into a full chip."
    />
  ),

  "chip-design-flow": (
    <FlowDiagram
      steps={["RTL Design", "Verification", "Floorplanning", "Physical Layout", "Tape-Out"]}
      caption="Front-end (logic) on the left, back-end (physical) on the right — changes get far more expensive the further right you go."
    />
  ),

  "soc-block-diagram": (
    <HubSpokeDiagram
      hub="Interconnect"
      spokes={["CPU Cores", "GPU", "Memory Controller", "Peripherals (USB/Display/Radio)"]}
      caption="An SoC's blocks are mostly licensed IP — the interconnect is what makes them work as one system."
    />
  ),

  "noc-mesh-fundamentals": (
    <MeshDiagram
      nodes={["CPU", "Router", "GPU", "Router", "Router", "Memory"]}
      highlightPath={[0, 1, 4, 5]}
      caption="A packet travels CPU → router → router → Memory — many such routes can be active on the mesh at once."
    />
  ),

  "ncore-coherency-comparison": (
    <ComparisonDiagram
      left={{ title: "Non-Coherent Link", items: ["Core A Cache", "Core B Cache"], synced: false }}
      right={{ title: "Ncore (Coherent)", items: ["Core A Cache", "Core B Cache"], synced: true }}
      caption="Without coherency, Core B can silently hold a stale copy of data Core A just changed."
    />
  ),

  "flexnoc-mesh": (
    <MeshDiagram
      nodes={["CPU Core", "Router", "Router", "Router", "Router", "USB Ctrl"]}
      highlightPath={[0, 1, 4, 5]}
      caption="FlexNoC/FlexGen/FlexWay route non-coherent traffic like this between a core and a peripheral — no cache synchronization needed."
    />
  ),

  "magillem-flow": (
    <FlowDiagram
      steps={["RTL", "IP-XACT (Packaging)", "Wired & Checked (Connectivity)", "Registers Synced (HW/SW/Docs)"]}
      caption="One source of truth flows into integration tooling, wiring, and the hardware/software interface — instead of three hand-maintained copies."
    />
  ),

  "core-loop-data-model": (
    <FlowDiagram
      steps={["Resource", "Learning Session", "Explain-Back", "Concept"]}
      caption="Noesis's core loop: material you add becomes a session, which you explain back, which updates what you know."
    />
  ),

  "concept-graph-excerpt": (
    <NodeGraphDiagram
      nodes={["Attention", "Transformers", "Mixture of Experts", "Embeddings"]}
      edges={[
        [0, 1],
        [1, 2],
        [1, 3],
      ]}
      caption="An LLM-inferred excerpt of the concept graph — edges are connections you actually drew across explain-backs, not a fixed taxonomy."
    />
  ),

  "session-lifecycle-states": (
    <FlowDiagram
      steps={["Pending", "Started", "Completed"]}
      caption="A session moves forward on real activity (starting it, submitting an explain-back) — never gated on a score."
    />
  ),

  "multi-track-hub": (
    <HubSpokeDiagram
      hub="Shared Grading Engine"
      spokes={["Learn Noesis — 4 levels", "Arteris 101 — 2 levels"]}
      caption="Both tracks share the same soft-gating, attempt-history, and grading code — only the module content and level set differ."
    />
  ),
};

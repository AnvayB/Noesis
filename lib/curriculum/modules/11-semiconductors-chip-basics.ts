import type { CurriculumModule } from "../types";

export const semiconductorsChipBasics: CurriculumModule = {
  slug: "semiconductors-chip-basics",
  track: "arteris",
  phase: "Phase 1 — Hardware & Chip Foundations",
  title: "Semiconductors & How Chips Are Made",
  summary:
    "What a semiconductor actually is, what a transistor does, and the very high-level path from raw silicon to a finished chip — the vocabulary everything else in this track builds on.",
  lesson: {
    diagramId: "transistor-to-chip",
    overview:
      "Every product in the Arteris lineup exists to solve a problem that only shows up once you're assembling many small circuits onto one chip. Before any of that makes sense, you need the very base layer: what silicon chips are physically made of, and what a transistor is doing at the bottom of the stack.",
    sections: [
      {
        heading: "Semiconductors and transistors",
        body:
          "A semiconductor is a material — almost always silicon in commercial chips — whose ability to conduct electricity can be precisely controlled, unlike a plain conductor (always conducts) or insulator (never does). That controllability is what makes it useful: by treating small regions of silicon in specific patterns, you can build a transistor, a tiny switch that turns a tiny current on or off based on a control signal. A transistor by itself does almost nothing interesting. Wire a handful of them together in the right pattern and you get a logic gate (AND, OR, NOT); wire millions to billions of gates together and you get a chip that can add numbers, store bits, or run a program. Modern chips pack billions of transistors — each only a few nanometers across — onto a piece of silicon smaller than a fingernail.",
      },
      {
        heading: "From design to a physical chip",
        body:
          "A chip starts as a design — logic described in code (more on this in the next module) — and ends as a physical object cut from a large silicon disc called a wafer. The company that actually manufactures the wafer is called a fab (fabrication plant, e.g. TSMC, Samsung, Intel Foundry); building and running a fab costs billions of dollars, which is why most chip companies, including Arteris's customers, design chips but don't fabricate them themselves — they hand off a finished design to a fab. A wafer holds many copies of the same chip printed side by side; after fabrication, the wafer is cut apart (diced) into individual chips (dies), each of which gets tested and packaged into the small black rectangle you'd recognize as a chip.",
      },
      {
        heading: "'Process node' — why you'll see numbers like 5nm",
        body:
          "You'll often see a fab's manufacturing technology described by a number like \"5nm\" or \"3nm\" — this is called the process node, and roughly (modern naming is more marketing than literal measurement) smaller numbers mean smaller transistors, which means more transistors fit in the same area, which usually means more performance and lower power per transistor. This matters for this track because a smaller/denser process is exactly what makes it possible to fit dozens of separate functional blocks onto one chip — which is precisely the situation that creates the on-chip communication problem Arteris's interconnect products solve.",
      },
    ],
    videos: [
      {
        title: "How Does a Transistor Work? — Veritasium",
        url: "https://www.youtube.com/watch?v=IcrBqCFLHIY",
      },
    ],
  },
  levels: {
    explain: {
      prompt:
        "In your own words, explain what a semiconductor and a transistor are, and why a chip company generally doesn't manufacture its own chips.",
      groundTruth:
        "A semiconductor (silicon) is a material whose conductivity can be precisely controlled, which lets you build a transistor — a tiny electrically-controlled switch. Transistors combine into logic gates, and gates combine into the billions-of-transistor circuits that make up a modern chip. Chip companies typically design chips but don't fabricate them because building/running a fab (the factory that manufactures silicon wafers) costs billions of dollars — so design and fabrication are usually split between different companies (a fabless design house and a foundry/fab).",
    },
  },
};

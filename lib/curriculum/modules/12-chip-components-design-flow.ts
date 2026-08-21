import type { CurriculumModule } from "../types";

export const chipComponentsDesignFlow: CurriculumModule = {
  slug: "chip-components-design-flow",
  track: "arteris",
  phase: "Phase 1 — Hardware & Chip Foundations",
  title: "Components of a Chip & the Chip Design Flow",
  summary:
    "The building blocks a chip is made of, and the front-end-to-back-end pipeline a design goes through on the way from an idea to a manufacturable layout.",
  lesson: {
    diagramId: "chip-design-flow",
    overview:
      "The previous module ended at 'gates combine into circuits.' This module zooms into what those circuits actually are on a modern chip, and walks through the design process — the pipeline Arteris's own tools plug into at specific stages.",
    sections: [
      {
        heading: "The building blocks: gates, blocks, and IP",
        body:
          "Logic gates (from the previous module) combine into small reusable circuits — a register (stores one bit), an adder, a multiplexer — which combine further into functional blocks: a CPU core, a memory controller, a video decoder, a security engine. A modern chip is essentially dozens of these blocks placed on one piece of silicon and wired together. Critically, most blocks on a chip are not designed from scratch by the company building the chip — they're licensed as IP (intellectual property) from specialist vendors, a topic the next-but-one module covers in depth. The chip designer's job increasingly is choosing the right blocks and getting them to work together correctly, not hand-designing every transistor.",
      },
      {
        heading: "Front-end: RTL and logic design",
        body:
          "A chip design starts life as RTL (Register-Transfer Level) code — not a schematic, but text, written in a hardware description language like Verilog or VHDL, describing what the circuit should do (e.g. 'on every clock cycle, add these two registers and store the result'). This is the front-end of chip design: writing and verifying logic. Verification is a huge part of this stage — simulating the RTL against millions of test cases before committing to manufacturing, because a bug found after a chip is fabricated can cost a full re-spin (months and millions of dollars) to fix.",
      },
      {
        heading: "Back-end: physical design, and the tape-out finish line",
        body:
          "Once the logic is verified, back-end (physical design) tools translate RTL into an actual physical layout: placing each gate at real x/y coordinates on the silicon, routing the microscopic wires that connect them, and checking that everything fits within power, timing, and area budgets — floorplanning is the step of deciding where each functional block sits on the chip, and it has a huge effect on how easy it is to wire things together (a theme the interconnect modules ahead return to directly). The process ends at tape-out: the point where the finished physical layout is sent to a fab to be manufactured — named for the literal tape reels layout data used to be recorded onto. After tape-out, changes are extremely expensive, which is why so much of the flow before it is about verification and simulation, not just building.",
      },
    ],
    videos: [
      {
        title: "The Semiconductor Design Software Duopoly: Cadence & Synopsys — Asianometry",
        url: "https://www.youtube.com/watch?v=AUm08ZUD63Q",
      },
    ],
  },
  levels: {
    explain: {
      prompt:
        "In your own words, explain the difference between front-end and back-end chip design, and where 'tape-out' falls in that flow.",
      groundTruth:
        "Front-end design is writing and verifying logic as RTL code (e.g. Verilog) describing what the circuit should do, with heavy simulation-based verification before anything is committed to hardware. Back-end (physical) design takes verified RTL and turns it into an actual physical layout — placing gates, routing wires, floorplanning where functional blocks sit on the silicon — while meeting power/timing/area constraints. Tape-out is the very end of the back-end stage: sending the finished physical layout to a fab for manufacturing. Changes after tape-out are extremely costly, which is why verification effort concentrates earlier in the flow.",
    },
  },
};

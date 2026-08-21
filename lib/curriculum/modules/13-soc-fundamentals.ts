import type { CurriculumModule } from "../types";

export const socFundamentals: CurriculumModule = {
  slug: "soc-fundamentals",
  track: "arteris",
  phase: "Phase 1 — Hardware & Chip Foundations",
  title: "What Is an SoC (System-on-Chip)",
  summary:
    "Why chips stopped being single-purpose circuits and became whole systems, and why integrating that system is the hard, expensive part.",
  lesson: {
    diagramId: "soc-block-diagram",
    overview:
      "An SoC (System-on-Chip) is a single chip that contains most or all of what used to be separate chips on a circuit board: one or more CPU cores, memory controllers, peripherals (USB, display, camera, radio), and often specialized accelerators (AI/ML, video, security) — all on one piece of silicon. Nearly every modern phone, car, and IoT device runs on an SoC rather than a board full of discrete chips.",
    sections: [
      {
        heading: "Why put everything on one chip?",
        body:
          "Putting components on one chip instead of a board full of separate chips is dramatically faster (on-chip wires are microscopic and fast; board-level wires are relatively huge and slow), lower-power (driving a signal across a chip costs far less energy than driving it across a circuit board), and cheaper at volume (one chip to manufacture and place, instead of many). This is why the industry moved toward SoCs for almost everything except the highest-performance server/desktop use cases.",
      },
      {
        heading: "Cores, memory, and peripherals",
        body:
          "An SoC's blocks generally fall into a few categories: compute (one or more CPU cores, sometimes plus GPU or specialized accelerators), memory (on-chip caches plus a controller that talks to external DRAM), and peripherals/IO (blocks that talk to the outside world — display, camera, USB, wireless radios, sensors). Each of these is very often licensed IP (see the IP & licensing module) from a different specialist vendor, not built in-house by the company selling the final chip.",
      },
      {
        heading: "Integration is the actual hard part",
        body:
          "Designing any one of those blocks well is hard, but it's a solved problem you can license. The genuinely hard, differentiating part of building an SoC is integration: getting a CPU core from one vendor, a GPU from another, a security block from a third, and a dozen other pieces of IP to all talk to each other correctly, quickly, and without one block starving another of bandwidth. That communication problem — how do a dozen-plus independent blocks send data to each other on one chip — is exactly what the next module (interconnects and NoCs) exists to solve, and it's the foundational problem Arteris's whole product line is built around.",
      },
    ],
    videos: [
      {
        title: "How do Smartphone CPUs Work? || Inside the System on a Chip — Branch Education",
        url: "https://www.youtube.com/watch?v=NKfW8ijmRQ4",
      },
    ],
  },
  levels: {
    explain: {
      prompt:
        "In your own words, explain what an SoC is and why 'integration' (rather than designing any single block) is described as the hard part of building one.",
      groundTruth:
        "An SoC (System-on-Chip) puts what used to be many separate chips — CPU cores, memory controllers, and peripherals like display/USB/radios — onto one piece of silicon, for speed, power, and cost reasons versus a multi-chip board. Most individual blocks are licensed IP from specialist vendors rather than built in-house, so the genuinely hard and differentiating work is integration: getting many independently-designed blocks to communicate correctly and efficiently on one chip without one starving another of bandwidth — the on-chip communication problem that interconnect/NoC IP exists to solve.",
    },
  },
};

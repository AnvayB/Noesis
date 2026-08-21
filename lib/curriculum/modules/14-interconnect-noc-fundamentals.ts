import type { CurriculumModule } from "../types";

export const interconnectNocFundamentals: CurriculumModule = {
  slug: "interconnect-noc-fundamentals",
  track: "arteris",
  phase: "Phase 1 — Hardware & Chip Foundations",
  title: "Interconnects & Networks-on-Chip (NoC)",
  summary:
    "Why simple point-to-point wiring breaks down as SoCs grow, what a Network-on-Chip is, and the coherent-vs-non-coherent split that defines Arteris's two interconnect product lines.",
  lesson: {
    diagramId: "noc-mesh-fundamentals",
    overview:
      "This is the single most important module in the foundations phase — it's the problem Arteris's core products exist to solve. An interconnect is the on-chip communication system that lets an SoC's separate blocks (CPU, GPU, memory controller, peripherals) send data to each other.",
    sections: [
      {
        heading: "Why you can't just wire everything to everything",
        body:
          "The naive way to connect N blocks so any pair can talk is a direct wire between every pair — which requires roughly N² wires and grows unmanageably fast as blocks are added; a chip with 30 blocks would need hundreds of dedicated wire paths, most sitting idle most of the time. A shared bus (one set of wires, everyone takes turns) fixes the wire-count problem but creates a new one: only one conversation can happen at a time, so it becomes a bottleneck as more blocks compete for it. Real SoCs today have dozens of blocks (CPU cores, GPU, video codec, security engine, multiple peripherals) all needing to talk to memory and to each other simultaneously — neither naive approach scales.",
      },
      {
        heading: "Network-on-Chip (NoC): treating the chip like a tiny network",
        body:
          "The modern solution borrows an idea from computer networking: instead of one shared bus or N² dedicated wires, build an actual packet-switched network on the chip itself — a NoC. Data moves between blocks as packets routed through routers and links, the same conceptual shape as a data center network, just physically miniaturized onto one piece of silicon. This lets many block-to-block conversations happen at once (like separate network routes), scales much better as blocks are added, and can be tuned for the specific traffic patterns of a given chip. This is the core category Arteris operates in — a NoC is what a product like FlexNoC actually is.",
      },
      {
        heading: "Coherent vs. non-coherent: the split that defines Arteris's two interconnect product lines",
        body:
          "When multiple CPU cores each keep their own local cache (a fast copy of recently-used memory), you get a correctness problem: if core A changes a value in its cache, core B's cache might still hold the old, now-stale copy. A cache-coherent interconnect actively tracks which cores have cached copies of which data and keeps them synchronized, so every core always sees a consistent view of memory — this is essential for multi-core CPU clusters, but it adds real complexity and overhead, so it's typically only used where it's actually needed (e.g. Arteris's Ncore product). A non-coherent interconnect skips that synchronization — it's simpler, cheaper, and lower-power, and is the right choice for connecting blocks that don't share mutable cached state with each other (most peripheral and accelerator connections on a chip — Arteris's FlexNoC/FlexGen/FlexWay family). Choosing coherent vs. non-coherent per link is itself a major SoC design decision, not just a technical detail.",
      },
    ],
    videos: [
      {
        title: "Lec 93 — Network-on-Chip Basics",
        url: "https://www.youtube.com/watch?v=7-KJ3BnFsr8",
      },
    ],
  },
  levels: {
    explain: {
      prompt:
        "In your own words, explain why SoCs use a Network-on-Chip instead of a simple shared bus or direct wiring, and what the difference is between a coherent and a non-coherent interconnect.",
      groundTruth:
        "Direct wiring between every pair of blocks needs roughly N² wires and doesn't scale; a single shared bus avoids that but only allows one conversation at a time, which bottlenecks as more blocks compete for it. A Network-on-Chip solves both by routing data as packets through an actual on-chip network (routers and links), the same conceptual idea as a data-center network, allowing many block-to-block conversations concurrently and scaling much better as blocks are added. A cache-coherent interconnect actively keeps multiple cores' local caches synchronized so they never see stale/conflicting data — necessary for multi-core CPU clusters sharing mutable memory, but adds overhead. A non-coherent interconnect skips that synchronization, making it simpler and lower-power, and is the right fit for connecting blocks (most peripherals/accelerators) that don't share mutable cached state.",
    },
  },
};

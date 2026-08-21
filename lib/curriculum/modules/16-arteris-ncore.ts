import type { CurriculumModule } from "../types";

export const arterisNcore: CurriculumModule = {
  slug: "arteris-ncore",
  track: "arteris",
  phase: "Phase 2 — Arteris Product Families",
  title: "Coherent Interconnect — Ncore",
  summary:
    "Arteris's cache-coherent interconnect IP, for SoCs with multiple CPU cores (often from different vendors) that need a consistent, synchronized view of shared memory.",
  lesson: {
    diagramId: "ncore-coherency-comparison",
    overview:
      "Ncore is Arteris's cache-coherent interconnect — the product that implements the 'coherent' half of the coherent-vs-non-coherent split from the foundations phase. Arteris describes it as simplifying multi-core SoC design through heterogeneous coherency, efficient caching, and high throughput.",
    sections: [
      {
        heading: "What problem Ncore solves",
        body:
          "Recall from the interconnect fundamentals module: when multiple CPU cores each keep their own local cache, one core changing a value can leave other cores holding a stale copy unless something actively keeps those caches synchronized. Ncore is that something — it tracks which cores have cached copies of which memory and keeps them consistent, so software running across multiple cores always sees correct, up-to-date data without every core having to bypass its cache and go to slow main memory on every access.",
      },
      {
        heading: "'Heterogeneous' coherency",
        body:
          "Arteris specifically markets Ncore around heterogeneous coherency — supporting coherence across cores that aren't all the same type or from the same vendor (e.g. a mix of CPU clusters, GPU, and accelerators that all need a shared, consistent view of memory), rather than only working within one uniform CPU cluster. This matters because modern SoCs increasingly combine IP from many different vendors (see the IP-licensing module) — a coherent interconnect that only worked within a single vendor's CPU cluster would defeat much of the point of a mix-and-match IP ecosystem.",
      },
      {
        heading: "The cost of coherency, and why it's a separate product",
        body:
          "Coherency isn't free — tracking and synchronizing caches across many cores adds real hardware complexity, latency, and power cost, which is exactly why Arteris offers it as a distinct product line from its non-coherent interconnects (FlexNoC/FlexGen/FlexWay) rather than making every interconnect coherent by default. An SoC designer only pays that cost where it's actually needed — typically around CPU/GPU clusters sharing mutable data — and uses simpler non-coherent connections everywhere else on the chip.",
      },
    ],
    sourceFiles: ["https://www.arteris.com/products/ncore/"],
    videos: [
      {
        title:
          "Arteris IP: A Flexible Multiprotocol Cache Coherent Network-on-Chip (NoC) for Heterogeneous SoCs",
        url: "https://www.youtube.com/watch?v=mhCQapw8_84",
      },
    ],
  },
  levels: {
    explain: {
      prompt:
        "In your own words, explain what Ncore does, what 'heterogeneous coherency' means in this context, and why coherency is offered as a separate product rather than built into every interconnect.",
      groundTruth:
        "Ncore is Arteris's cache-coherent interconnect: it tracks which CPU/GPU/accelerator cores have cached copies of which memory and keeps those caches synchronized, so software sees a consistent view of shared data even though multiple cores cache it independently. 'Heterogeneous' coherency means this works across a mix of different core types/vendors on one SoC, not just within one uniform CPU cluster — important since modern SoCs combine IP from many vendors. Coherency adds real complexity, latency, and power cost, so it's offered as a distinct product from Arteris's non-coherent interconnects rather than applied everywhere by default — a designer only pays that cost where cores actually need a shared, consistent view of mutable memory, and uses simpler non-coherent links elsewhere.",
    },
  },
};

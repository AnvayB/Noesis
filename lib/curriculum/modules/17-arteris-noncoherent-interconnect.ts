import type { CurriculumModule } from "../types";

export const arterisNoncoherentInterconnect: CurriculumModule = {
  slug: "arteris-noncoherent-interconnect",
  track: "arteris",
  phase: "Phase 2 — Arteris Product Families",
  title: "Non-Coherent Interconnect — FlexGen, FlexNoC, FlexWay",
  summary:
    "Arteris's core NoC product family for connecting blocks that don't need cache coherency — three products aimed at different points on the automation/performance/cost spectrum.",
  lesson: {
    diagramId: "flexnoc-mesh",
    overview:
      "This is Arteris's largest and most central product family — the implementation of the 'non-coherent interconnect' half of the coherent-vs-non-coherent split, used for the majority of connections on a typical SoC (most peripherals and accelerators don't share mutable cached state, so they don't need Ncore's coherency machinery). Three related products cover different needs: FlexNoC is the core NoC IP, FlexGen automates generating a FlexNoC design, and FlexWay targets smaller, cost-sensitive chips.",
    sections: [
      {
        heading: "FlexNoC — the core NoC IP",
        body:
          "FlexNoC is Arteris's foundational non-coherent Network-on-Chip product, marketed as 'physically aware' — meaning the tool accounts for the actual physical floorplan (recall: where blocks are literally placed on the silicon, from the chip design flow module) when building the on-chip network, rather than designing the network's logical topology in isolation and hoping it fits well physically afterward. It also offers optional ISO 26262 safety certification, the automotive functional-safety standard — relevant because interconnects in a car's SoC (e.g. controlling safety-critical sensors or braking-related compute) need certified guarantees about how they fail, not just how they perform.",
      },
      {
        heading: "FlexGen — automating NoC design with AI-driven optimization",
        body:
          "Designing a good NoC topology by hand — deciding how many routers, where they sit, how links connect — is a large, complex optimization problem, especially as SoCs grow to dozens of blocks. FlexGen automates that design process, using AI-driven optimization to generate a high-performance NoC configuration rather than requiring an engineer to hand-tune it. This reflects a broader trend also visible in software chip-design tooling generally: as design complexity grows faster than engineering headcount can, automation (increasingly AI-assisted) takes over work that used to be manual, expert-driven design.",
      },
      {
        heading: "FlexWay — for cost- and power-constrained edge devices",
        body:
          "Not every chip is a high-end mobile or automotive SoC — a huge volume of chips are simple IoT edge devices and microcontrollers, where die area and power budget are extremely tight and a full-featured NoC would be overkill. FlexWay is Arteris's interconnect aimed specifically at that segment: cost-efficient and low-power, trading away some of FlexNoC's scale/flexibility for a lighter footprint suited to small, simple SoCs. Having three products instead of one 'universal' interconnect reflects a general lesson in IP/tooling design: the right amount of capability (and its cost) depends heavily on the target use case, not just raw peak capability.",
      },
    ],
    sourceFiles: [
      "https://www.arteris.com/products/flexnoc/",
      "https://www.arteris.com/products/flexgen/",
      "https://www.arteris.com/products/flexway/",
    ],
  },
  levels: {
    explain: {
      prompt:
        "In your own words, explain what each of FlexNoC, FlexGen, and FlexWay is for, and why Arteris offers three separate non-coherent interconnect products instead of one.",
      groundTruth:
        "FlexNoC is the core non-coherent NoC IP, 'physically aware' (it accounts for the real floorplan when building the network) and available with ISO 26262 automotive safety certification. FlexGen automates the process of designing a NoC configuration using AI-driven optimization, replacing manual hand-tuning of topology. FlexWay targets cost- and power-constrained IoT/microcontroller chips, trading scale/flexibility for a lighter footprint. Arteris offers three products rather than one because the right interconnect capability (and its cost/complexity) depends heavily on the target chip segment — a high-end automotive SoC, a design team wanting automated optimization, and a tiny low-power IoT chip all have genuinely different needs.",
    },
  },
};

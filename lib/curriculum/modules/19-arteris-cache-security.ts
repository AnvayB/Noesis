import type { CurriculumModule } from "../types";

export const arterisCacheSecurity: CurriculumModule = {
  slug: "arteris-cache-security",
  track: "arteris",
  phase: "Phase 2 — Arteris Product Families",
  title: "Other Arteris IP: Last-Level Cache & Hardware Security",
  summary:
    "A lighter-touch overview of two smaller Arteris product lines: CodaCache (last-level cache IP) and the Cycuity Radix family (hardware security verification).",
  lesson: {
    overview:
      "Rounding out the product tour, these two lines are worth knowing about but get less depth here than Ncore, the Flex family, and Magillem — CodaCache addresses a narrower, specific performance problem, and the Cycuity Radix family covers hardware security verification rather than interconnect/integration.",
    sections: [
      {
        heading: "CodaCache — last-level cache IP",
        body:
          "A last-level cache (LLC) is a shared, on-chip cache that sits between the CPU cores/blocks and external DRAM — the last stop before a memory request has to leave the chip entirely, which is comparatively slow and power-hungry. CodaCache is Arteris's configurable last-level cache IP, aimed at absorbing more memory traffic on-chip so fewer requests need to make that expensive trip off-chip, addressing power, data-access, and timing challenges as SoCs scale. It's a natural companion to the interconnect products: the interconnect gets data to where it needs to go, and a well-placed last-level cache reduces how often that trip has to extend all the way to external memory in the first place.",
      },
      {
        heading: "Cycuity Radix family — hardware security verification",
        body:
          "Cycuity (an Arteris product line) addresses a different problem entirely: verifying that a chip design doesn't leak or expose secrets it shouldn't, before it's ever manufactured. Radix-S plugs into simulation-based verification workflows to check for security issues at the block/simulation level; Radix-M extends that same kind of security verification up to the full SoC and system level, where interactions between blocks can create vulnerabilities no single block has on its own; and Radix-ST is a static security analyzer, meaning it examines the design without running simulations at all, aimed at catching issues as early as possible in the design phase — generally the cheapest point to fix a problem, per the chip design flow module's point about post-tape-out changes being extremely costly.",
      },
    ],
    sourceFiles: [
      "https://www.arteris.com/products/codacache/",
      "https://www.arteris.com/products/cycuity/",
    ],
  },
  levels: {
    explain: {
      prompt:
        "In your own words, explain what CodaCache does and, at a high level, how the three Cycuity Radix products relate to each other.",
      groundTruth:
        "CodaCache is a configurable last-level cache — a shared on-chip cache sitting between compute blocks and external DRAM — that absorbs more memory traffic on-chip so fewer requests need the slower, more power-hungry trip off-chip. The Cycuity Radix products are all about hardware security verification but at different scopes and design stages: Radix-S does simulation-based security verification at the block level, Radix-M extends that same verification to the full SoC/system level (where cross-block interactions can create vulnerabilities), and Radix-ST is a static analyzer that checks the design without running simulations, aimed at catching issues as early as possible in the design phase.",
    },
  },
};

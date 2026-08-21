import type { CurriculumModule } from "../types";

export const semiconductorIpLicensing: CurriculumModule = {
  slug: "semiconductor-ip-licensing",
  track: "arteris",
  phase: "Phase 1 — Hardware & Chip Foundations",
  title: "Semiconductor IP & the Licensing Model",
  summary:
    "What 'IP' means in chip design, soft vs. hard IP, and why licensing specialized blocks — rather than building everything in-house — is standard practice and exactly why a company like Arteris exists.",
  lesson: {
    overview:
      "Every module so far has mentioned that most functional blocks on an SoC are 'licensed IP' rather than built from scratch. This module makes that idea precise, since it's the business and technical model Arteris itself operates in — Arteris doesn't sell chips, it sells IP that chip companies build into their own designs.",
    sections: [
      {
        heading: "What 'IP' means here",
        body:
          "In chip design, IP (intellectual property) means a pre-designed, reusable functional block — a CPU core, a memory controller, a security module, an interconnect — that a specialist company designs once, verifies thoroughly, and then licenses to many different chip companies to use in their own SoCs. This mirrors how most software is built on top of libraries instead of writing everything from scratch: a chip company building, say, a car infotainment SoC doesn't want to design its own interconnect or security-verification tooling from zero when a company that specializes in exactly that already exists.",
      },
      {
        heading: "Soft IP vs. hard IP",
        body:
          "IP is typically delivered in one of two forms. Soft IP is delivered as RTL source code (see the chip design flow module) — flexible, because the licensee can adapt it to their own manufacturing process and configure it for their needs, but it still has to go through the licensee's own front-end/back-end design flow. Hard IP is delivered as an already physically-laid-out block, tied to a specific manufacturing process — faster to integrate and closer to guaranteed performance, but far less flexible, since it can't be retargeted to a different fab or process node. Arteris's interconnect products are generated/configured as soft IP, tailored per customer design rather than delivered as one fixed hard block — which fits the fact that every SoC has a different set of blocks and floorplan that the interconnect has to be shaped around.",
      },
      {
        heading: "Why license instead of build in-house?",
        body:
          "Building a correct, high-performance interconnect (or CPU core, or security engine) from scratch takes deep, narrow expertise and years of accumulated verification — the same reason companies license explainable-AI, payments, or auth infrastructure instead of building it themselves. Licensing lets a chip company focus its own engineering effort on what actually differentiates their product, while trusting a specialist for the parts that are hard but not differentiating. This is precisely Arteris's position in the industry: chip companies don't want to be interconnect experts, so Arteris is the interconnect expert they license from.",
      },
    ],
    videos: [
      {
        title: "Arm: The Silicon Blueprint — Business Breakdowns Ep. 200",
        url: "https://www.youtube.com/watch?v=fh8L5cL2VmQ",
      },
    ],
  },
  levels: {
    explain: {
      prompt:
        "In your own words, explain what 'IP' means in the chip industry, the difference between soft and hard IP, and why a chip company would license IP instead of building it themselves.",
      groundTruth:
        "In chip design, IP is a pre-designed, reusable functional block (CPU core, memory controller, interconnect, etc.) built by a specialist company and licensed to many chip companies, rather than each chip company reinventing it. Soft IP is delivered as RTL source code — flexible and portable across manufacturing processes but still needs to go through the licensee's own design flow; hard IP is delivered as an already physically laid-out block tied to a specific process — faster to integrate but inflexible. Companies license IP instead of building it in-house because deep expertise and years of verification effort are needed to get it right, and licensing lets engineering effort focus on what actually differentiates the final product rather than reinventing hard-but-non-differentiating infrastructure.",
    },
  },
};

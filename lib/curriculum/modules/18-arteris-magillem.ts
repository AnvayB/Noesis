import type { CurriculumModule } from "../types";

export const arterisMagillem: CurriculumModule = {
  slug: "arteris-magillem",
  track: "arteris",
  phase: "Phase 2 — Arteris Product Families",
  title: "Magillem — SoC Integration & HW/SW Interface",
  summary:
    "Arteris's automation tooling for the unglamorous but essential work of wiring an SoC's IP blocks together correctly and keeping hardware, software, and documentation in sync as the design changes.",
  lesson: {
    diagramId: "magillem-flow",
    overview:
      "Where Ncore and the Flex family solve how data physically moves between blocks, Magillem solves a different, earlier problem: making sure a design made of many licensed IP blocks (from possibly many vendors) is actually wired together correctly, and that everyone downstream — RTL, software drivers, documentation — agrees on how each block is configured. Arteris groups Magillem's tools under two related product names: Magillem Connectivity/Packaging (system integration) and Magillem Registers (the hardware/software interface).",
    sections: [
      {
        heading: "Magillem Connectivity — automating integration, with built-in checkers",
        body:
          "Recall from the SoC fundamentals module that integration — getting many independently-designed blocks to work correctly together — is the genuinely hard part of building an SoC. Doing that wiring by hand across dozens of IP blocks is slow and error-prone (a single miswired connection can silently corrupt data or waste months in debug). Magillem Connectivity automates this integration work and includes built-in checkers that catch wiring/configuration errors early, before they turn into an expensive bug found late in verification or, worse, after tape-out.",
      },
      {
        heading: "Magillem Packaging — IP-XACT and RTL import",
        body:
          "For automation tools to reason about an IP block (what registers it has, what interfaces it exposes), the block needs a structured, machine-readable description of itself — not just RTL source code, which is what a synthesis tool reads but not what an integration tool can easily reason about. IP-XACT is an industry-standard XML format for exactly this: describing an IP block's registers, interfaces, and parameters in a structured way that tools across the industry can read. Magillem Packaging automates creating these IP-XACT descriptions directly from RTL import, so a design's metadata for integration tooling stays accurate without engineers hand-writing and maintaining it separately from the actual RTL.",
      },
      {
        heading: "Magillem Registers — keeping hardware, software, and documentation in sync",
        body:
          "Every hardware register a chip exposes (a small piece of configuration/status memory a block reads or writes) needs to be understood identically by three different things: the RTL that implements it, the software/driver code that reads and writes it, and the documentation engineers rely on to use it correctly. If those three drift out of sync — say, RTL changes a register's bit layout but the driver code doesn't get updated — you get a hardware/software bug that's often very painful to track down. Magillem Registers keeps all three synchronized from a single source of truth, generating the RTL, software headers, and documentation from the same register definitions instead of maintaining them by hand in three separate places — the same general principle as generating code from a schema instead of hand-writing matching structs in multiple languages.",
      },
    ],
    sourceFiles: [
      "https://www.arteris.com/products/magillem-connectivity/",
      "https://www.arteris.com/products/magillem-packaging/",
      "https://www.arteris.com/products/magillem-registers/",
    ],
  },
  levels: {
    explain: {
      prompt:
        "In your own words, explain what problem Magillem Connectivity/Packaging solves versus what Magillem Registers solves, and why keeping hardware, software, and documentation in sync is a real engineering problem.",
      groundTruth:
        "Magillem Connectivity automates wiring many IP blocks together correctly and includes built-in checkers to catch integration errors early. Magillem Packaging automates generating IP-XACT (a structured, machine-readable IP description format) from RTL import, so integration tooling has accurate metadata about each block without engineers hand-maintaining it separately. Magillem Registers solves a different problem: every hardware register needs to be understood identically by RTL, software/driver code, and documentation, and if these drift apart (e.g. RTL changes a register layout but software isn't updated) you get hard-to-debug hardware/software bugs — Magillem Registers generates all three from one source of truth instead of maintaining them separately by hand.",
    },
  },
};

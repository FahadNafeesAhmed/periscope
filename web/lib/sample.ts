// A sample brief shown while the agents are offline, so a visitor sees the output before running anything.
// Every value comes from the team's reported Helix Ledger test run (the same figures as the benchmark page);
// the page labels it as a sample.
import type { Observation } from "./api";
import type { BriefData } from "./brief";

const T = "https://testsaasstartup.vercel.app";
const at = "2026-09-13T14:16:00.000Z";
const vantage = (country: string | null = null, authenticated = false) => ({ country, device: "desktop" as const, authenticated });
const ob = (id: string, url: string, text: string, over: Partial<Observation> = {}): Observation => ({
  id, runId: "sample", competitor: "helix-ledger", url: `${T}${url}`, layer: "surface", kind: "text", text, vantage: vantage(), capturedAt: at, ...over,
});

const hidden: Observation[] = [
  ob("annual", "/pricing", "CA$26 per user per month, billed annually", { layer: "hidden", missedByFetch: true, revealedBy: { action: "toggle", label: "Annual" } }),
  ob("volume", "/pricing", "Volume pricing from $39 per user per month for 100 seats or more", { layer: "hidden", missedByFetch: true, revealedBy: { action: "select", label: "100+ seats" } }),
];
const inside: Observation[] = [
  ob("seats", "/dashboard", "25 of 30 seats used", { layer: "interior", vantage: vantage(null, true) }),
];

export const SAMPLE_BRIEF: BriefData = {
  competitor: "helix-ledger",
  origin: T,
  runs: [],
  running: false,
  updatedAt: at,
  coverage: [],
  grids: [{
    url: `${T}/pricing`, shared: 0, differsByCountry: true, differsByDevice: false,
    countries: [
      { country: "CA", uniqueToCountry: [], prices: ["CA$26 per user per month, billed annually"] },
      { country: "US", uniqueToCountry: [], prices: ["$29 per user per month"] },
      { country: "DE", uniqueToCountry: [], prices: ["€31 per user per month"] },
    ],
  }],
  prices: [],
  matrix: [
    { id: "team", competitor: "helix-ledger", feature: "Team plan", status: "observed", value: null, evidence: ["pricing"] },
    { id: "pro", competitor: "helix-ledger", feature: "Pro plan", status: "observed", value: null, evidence: ["pricing"] },
  ],
  matrixNote: "",
  hidden,
  inside,
  diff: null,
  diffFrom: null,
};

/** Reported benchmark: 65 facts planted in Helix Ledger, counted in what each approach collected. */
export const BENCHMARK = [
  { name: "Periscope", facts: 63 },
  { name: "ChatGPT with browsing", facts: 38 },
  { name: "Claude + plain fetch", facts: 22 },
  { name: "Claude + reader connector", facts: 21 },
];
export const BENCHMARK_TOTAL = 65;

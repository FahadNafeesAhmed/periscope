// The brief: everything the followed runs learned about one competitor, reduced to what a founder or investor would
// repeat in a meeting. Findings are derived from API data only; each one names where it was seen.
"use client";
import {
  apiGet, countryName, usePoll,
  type BordersGrid, type CoveragePage, type MatrixRow, type Observation, type PriceRow, type RunDiff, type RunSummary, type RunView,
} from "./api";

export type BriefData = {
  competitor: string;
  origin: string | null;
  runs: RunView[];
  running: boolean;
  updatedAt: string | null;
  coverage: CoveragePage[];
  grids: BordersGrid[];
  prices: PriceRow[];
  matrix: MatrixRow[];
  matrixNote: string;
  hidden: Observation[];
  inside: Observation[];
  diff: RunDiff | null;
  diffFrom: RunSummary | null;
};

export type FindingKind = "country" | "hidden" | "inside" | "change" | "document" | "limit";
/** A sentence with one fact worth highlighting, and where it came from. */
export type Finding = { id: string; kind: FindingKind; lead: string; fact: string; tail?: string; source: string };

const MONEY = /(CA\$|US\$|A\$|R\$|\$|€|£|₹|¥)\s?\d[\d,.]*|\d[\d,.]*\s?(€|EUR|USD|CAD)/;
export const moneyIn = (text: string) => text.match(MONEY)?.[0]?.replace(/\s+/g, "") ?? null;
export const pathOf = (url: string) => { try { return new URL(url).pathname.replace(/\/$/, "") || "/"; } catch { return url; } };
export const hostOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };
const pageName = (url: string) => { const p = pathOf(url).split("/").filter(Boolean).pop(); return p ? `${p.replace(/[-_]/g, " ")} page` : "home page"; };
const VERB: Record<string, string> = { toggle: "flipping", click: "opening", select: "choosing", hover: "hovering over", scroll: "scrolling to" };
export const revealPhrase = (o: Observation) => {
  const label = o.revealedBy?.label;
  if (!label) return "after interacting with the page";
  return `after ${VERB[o.revealedBy?.action ?? "click"] ?? "using"} “${label}”`;
};

/** Everything the followed runs know, polled together so the brief is always one consistent snapshot. */
export function useBrief(runIds: string[], allRuns: RunSummary[] | null): BriefData | null {
  const key = runIds.join(",");
  return usePoll(async () => {
    if (!runIds.length) return null;
    const out: BriefData = { competitor: "", origin: null, runs: [], running: false, updatedAt: null, coverage: [], grids: [], prices: [], matrix: [], matrixNote: "", hidden: [], inside: [], diff: null, diffFrom: null };
    await Promise.all(runIds.map(async (id) => {
      const [run, c, b, p, m, obs] = await Promise.all([
        apiGet<RunView>(`/runs/${id}`),
        apiGet<{ pages: CoveragePage[] }>(`/runs/${id}/coverage`),
        apiGet<{ grids: BordersGrid[] }>(`/runs/${id}/borders`),
        apiGet<{ rows: PriceRow[] }>(`/runs/${id}/prices`),
        apiGet<{ rows: MatrixRow[]; note?: string }>(`/runs/${id}/matrix`),
        apiGet<{ observations: Observation[] }>(`/runs/${id}/observations?limit=400`),
      ]);
      if (run?.ok) out.runs.push(run);
      out.coverage.push(...(c?.pages ?? []));
      out.grids.push(...(b?.grids ?? []));
      out.prices.push(...(p?.rows ?? []));
      out.matrix.push(...(m?.rows ?? []));
      out.matrixNote ||= m?.note ?? "";
      for (const o of obs?.observations ?? []) {
        if (o.layer === "hidden" && o.missedByFetch) out.hidden.push(o);
        else if (o.layer === "interior" && o.kind !== "screen") out.inside.push(o);
      }
    }));
    if (!out.runs.length) return null;
    out.competitor = out.runs.map((r) => r.jobs[0]?.competitor).find(Boolean) ?? "";
    const firstUrl = out.runs.flatMap((r) => r.jobs.map((j) => j.url)).find(Boolean);
    out.origin = firstUrl ? (() => { try { return new URL(firstUrl).origin; } catch { return null; } })() : null;
    out.running = out.runs.some((r) => r.run.status === "running" || r.run.status === "queued");
    out.updatedAt = out.runs.map((r) => r.run.updatedAt).sort().at(-1) ?? null;

    // What changed: compare the page-reading run with the previous one for the same competitor.
    const parse = out.runs.find((r) => r.jobs.some((j) => j.purpose === "reveal"));
    if (parse && allRuns) {
      const prev = allRuns.find((r) => r.id !== parse.run.id && r.competitors.includes(out.competitor) && (r.purposes ?? []).includes("reveal") && r.createdAt < parse.run.createdAt && r.status === "completed");
      if (prev) {
        const d = await apiGet<RunDiff & { ok: boolean }>(`/runs/${parse.run.id}/diff?from=${prev.id}`);
        if (d?.ok) { out.diff = d; out.diffFrom = prev; }
      }
    }
    return out;
  }, 6000, [key, allRuns ? allRuns.length : -1]);
}

/** The handful of sentences a reader should take away, most decision-relevant first. */
export function findingsFor(b: BriefData): Finding[] {
  const out: Finding[] = [];
  for (const g of b.grids.filter((x) => x.differsByCountry)) {
    const parts = g.countries.map((c) => ({ c: countryName(c.country) ?? c.country, m: c.prices.map(moneyIn).find(Boolean) })).filter((x) => x.m);
    if (parts.length > 1) out.push({ id: `country-${g.url}`, kind: "country", lead: "Prices change by country:", fact: parts.map((x) => `${x.m} in ${x.c}`).join(", "), tail: ".", source: `${pageName(g.url)} · opened from ${parts.length} countries` });
  }
  const hiddenPrices = b.hidden.filter((o) => moneyIn(o.text));
  for (const o of hiddenPrices.slice(0, 2)) {
    out.push({ id: `hidden-${o.id}`, kind: "hidden", lead: `Only visible ${revealPhrase(o)}:`, fact: o.text, tail: ".", source: `${pageName(o.url)} · missed by a plain fetch` });
  }
  const limits = b.matrix.filter((r) => /limited|enterprise/i.test(`${r.status} ${r.value ?? ""}`));
  if (limits.length) out.push({ id: "limits", kind: "limit", lead: "Gated to higher plans:", fact: limits.slice(0, 3).map((r) => (r.value ? `${r.feature}: ${r.value}` : r.feature)).join("; "), tail: ".", source: `feature extraction · ${limits.reduce((s, r) => s + r.evidence.length, 0)} source lines` });
  if (b.inside.length) {
    const pick = b.inside.filter((o) => /\d/.test(o.text)).slice(0, 2);
    const facts = (pick.length ? pick : b.inside.slice(0, 2)).map((o) => o.text);
    out.push({ id: "inside", kind: "inside", lead: "Signed in as a customer:", fact: facts.join("; "), tail: ".", source: plural(new Set(b.inside.map((o) => pathOf(o.url))).size, "screen") + " behind the login" });
  }
  if (b.diff && b.diff.priceChanges.length && b.diffFrom) {
    const c = b.diff.priceChanges[0];
    const was = b.diff.removed.find((r) => r.url === c.url && shape(r.text) === shape(c.text));
    const from = was && moneyIn(was.text), to = moneyIn(c.text);
    const more = b.diff.priceChanges.length - 1;
    out.push({ id: "change", kind: "change", lead: `Changed since ${shortDate(b.diffFrom.createdAt)}:`, fact: from && to ? `${from} → ${to}` : c.text, tail: `${from && to ? ` in “${c.text}”` : ""}${more > 0 ? `, and ${plural(more, "more price line")}` : ""}.`, source: `${pageName(c.url)} · compared with the run of ${shortDate(b.diffFrom.createdAt)}` });
  }
  const docs = b.hidden.filter((o) => o.kind === "document");
  if (docs.length) out.push({ id: "docs", kind: "document", lead: `Found ${docs.length} document${docs.length === 1 ? "" : "s"} behind clicks:`, fact: docs.slice(0, 3).map((o) => o.text.split("/").pop()).join(", "), tail: ".", source: pageName(docs[0].url) });
  const missed = b.coverage.reduce((s, p) => s + (typeof p.counter === "number" ? p.counter : 0), 0);
  if (missed && out.length < 6) out.push({ id: "missed", kind: "hidden", lead: "In total,", fact: `${missed} lines on ${b.coverage.filter((p) => typeof p.counter === "number" && p.counter > 0).length} pages`, tail: " never reach a plain fetch or a chatbot that reads the page source.", source: "coverage across every page read" });
  return out.slice(0, 6);
}

export const shortDate = (s: string) => new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
export const relTime = (s: string | null) => {
  if (!s) return "";
  const sec = Math.max(0, Math.round((Date.now() - new Date(s).getTime()) / 1000));
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.round(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.round(sec / 3600)} h ago`;
  return shortDate(s);
};

/** Markdown for pasting into a memo, a board update, or a Slack thread. */
export function briefMarkdown(b: BriefData, findings: Finding[]): string {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  const L: string[] = [`# ${b.competitor || "Competitor"}: competitive brief`, `${b.origin ?? ""} · ${date} · Periscope`, ""];
  if (findings.length) { L.push("## Key findings"); for (const f of findings) L.push(`- ${f.lead} **${f.fact}**${f.tail ?? ""} _(${f.source})_`); L.push(""); }
  if (b.grids.length) {
    L.push("## Pricing by country");
    for (const g of b.grids) { L.push(`${pathOf(g.url)}`); for (const c of g.countries) L.push(`- ${countryName(c.country)}: ${c.prices.slice(0, 4).join("; ")}`); }
    L.push("");
  } else if (b.prices.length) {
    L.push("## Pricing"); for (const r of b.prices.slice(0, 15)) L.push(`- ${r.text}`); L.push("");
  }
  if (b.hidden.length) { L.push("## Hidden behind clicks"); for (const o of b.hidden.slice(0, 15)) L.push(`- ${o.text} _(${pathOf(o.url)}, ${revealPhrase(o)})_`); L.push(""); }
  if (b.inside.length) { L.push("## Behind the login"); for (const o of b.inside.slice(0, 10)) L.push(`- ${o.text} _(${pathOf(o.url)})_`); L.push(""); }
  if (b.matrix.length) { L.push("## Features and plans"); for (const r of b.matrix) L.push(`- ${r.feature}: ${r.status}${r.value ? ` (${r.value})` : ""}`); L.push(""); }
  L.push("---", "Every line above was observed in a real browser session; Periscope keeps the page, country and action behind each one.");
  return L.join("\n");
}

const csvCell = (s: string | null | undefined) => `"${(s ?? "").replace(/"/g, '""')}"`;
export function pricesCsv(b: BriefData): string {
  const rows = [["competitor", "page", "country", "device", "amount", "currency", "period", "text", "layer"].join(",")];
  for (const r of b.prices) rows.push([b.competitor, pathOf(r.url), countryName(r.country) ?? "home", r.device, r.amount, r.currency, r.period, r.text, r.layer].map(csvCell).join(","));
  return rows.join("\n");
}

/** The same sentence with its amounts blanked, to pair an old price line with its new version. */
const shape = (t: string) => t.replace(new RegExp(MONEY.source, "g"), "#");
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

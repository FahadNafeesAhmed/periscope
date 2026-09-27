// Periscope API client for the console. Every number on the page comes from these routes (docs/api.md).
// The site is a static export, so all calls are made from the browser; the API answers with CORS headers.
"use client";
import { useEffect, useRef, useState } from "react";

export const API_BASE = (process.env.NEXT_PUBLIC_PERISCOPE_API_URL || "http://localhost:4747").replace(/\/$/, "");
export const TARGET_URL = (process.env.NEXT_PUBLIC_PERISCOPE_TARGET_URL || "https://testsaasstartup.vercel.app").replace(/\/$/, "");
export const TARGET_EMAIL = process.env.NEXT_PUBLIC_PERISCOPE_TARGET_EMAIL || "test@test.com";

export type Vantage = { country: string | null; device: "desktop" | "mobile"; authenticated: boolean };
export type LiveSession = {
  sessionId: string; viewerUrl: string; playerUrl: string; purpose?: string; vantage: Vantage;
  accountRef?: string; profileId?: string; startedAt?: string; deadlineAt: string; currentUrl: string | null;
  runId?: string; competitor?: string; pendingWall: string | null;
};
export type Handoff = { jobId: string; viewerUrl: string; wall: string; generation: number; state: string };
export type RunSummary = { id: string; status: string; spentUsd: number; capUsd: number; live: boolean; observations: number; competitors: string[]; purposes?: string[]; createdAt: string; updatedAt: string };
export type RunView = {
  ok: boolean;
  run: { id: string; status: string; createdAt: string; updatedAt: string; spentUsd: number; capUsd: number; live: boolean };
  jobs: Array<{ id: string; purpose: string; competitor: string | null; url: string | null; state: string; reason: string | null }>;
  counts: { observations: number; events: number; handoffs: number };
  counters: Array<{ competitor: string; url: string; missed: number | "uncertain" }>;
};
export type StoredEvent = { eventId: number; runId: string; jobId: string | null; type: string; createdAt: string; event: { type: string; data: Record<string, unknown> } };
export type CoveragePage = { url: string; surface: number; hidden: number; missedByFetch: number; documents: number; vantages: string[]; byAction: Record<string, number>; counter: number | "uncertain" };
export type BordersGrid = { url: string; shared: number; differsByCountry: boolean; differsByDevice: boolean; countries: Array<{ country: string; uniqueToCountry: string[]; prices: string[] }> };
export type PriceRow = { url: string; country: string | null; device: string; vantage: string; amount: string; currency: string | null; period: string | null; text: string; observationId: string; layer: string };
export type MatrixRow = { id: string; competitor: string; feature: string; status: string; value: string | null; evidence: string[] };

export async function apiGet<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(API_BASE + path, { cache: "no-store" });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export async function apiPost<T>(path: string, body: unknown, headers: Record<string, string> = {}): Promise<{ status: number; body: T | null }> {
  try {
    const r = await fetch(API_BASE + path, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
    return { status: r.status, body: (await r.json().catch(() => null)) as T | null };
  } catch {
    return { status: 0, body: null };
  }
}

/** Poll a loader on an interval; the value stays until the next successful load. */
export function usePoll<T>(load: () => Promise<T | null>, intervalMs: number, deps: unknown[] = []): T | null {
  const [value, setValue] = useState<T | null>(null);
  const loader = useRef(load);
  loader.current = load;
  useEffect(() => {
    let cancelled = false;
    const tick = async () => { const v = await loader.current(); if (!cancelled && v !== null) setValue(v); };
    void tick();
    const id = setInterval(tick, intervalMs);
    return () => { cancelled = true; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps]);
  return value;
}

export const COUNTRY_NAMES: Record<string, string> = { CA: "Canada", US: "United States", DE: "Germany", GB: "United Kingdom", FR: "France", JP: "Japan", AU: "Australia", IN: "India", BR: "Brazil" };
export const countryName = (c?: string | null) => (c ? COUNTRY_NAMES[c] ?? c : null);

export const DEMO_COUNTRIES = ["CA", "US", "DE"];
export type Launch = { runId?: string; error?: string };
/** Everything needed to open the same page from other countries later, once the page shows it is worth it. */
export type BordersPlan = { competitor: string; url: string; pages: string[]; runId: string; category?: string };

const stampNow = () => new Date().toISOString().slice(11, 19).replace(/:/g, "");

async function launch(body: Record<string, unknown>, key: string): Promise<Launch> {
  const { status, body: res } = await apiPost<{ ok: boolean; runId?: string; reason?: string }>("/runs", body, { "Idempotency-Key": key });
  if (res?.ok && res.runId) return { runId: res.runId };
  return { error: res?.reason ?? (status === 0 ? "Periscope is offline right now." : `HTTP ${status}`) };
}

/** The Helix Ledger demo: parse the pricing page and sign in. Other countries open separately, only when the page calls for it. */
export async function launchHelixDemo(target: string): Promise<{ parse: Launch; login: Launch; borders: BordersPlan }> {
  const stamp = stampNow();
  const parse = await launch({ competitor: "helix-ledger", url: target, pages: ["/pricing", "/regulatory", "/security"], jobs: ["surface", "benchmark", "reveal"], runId: `helix-parse-${stamp}` }, `web-helix-parse-${stamp}`);
  // accountRef trial1: the credential stored in the vault is injected; no proxy, the tunnel challenges proxied traffic
  const login = await launch({ competitor: "helix-ledger", url: target, jobs: ["walker"], start: `${target}/sign-in`, countries: [], accountRef: "trial1", runId: `helix-login-${stamp}` }, `web-helix-login-${stamp}`);
  return { parse, login, borders: { competitor: "helix-ledger", url: target, pages: ["/pricing"], runId: `helix-borders-${stamp}` } };
}

/** A single custom run against any url: surface, benchmark and reveal. Countries are a separate, deliberate step. */
export async function launchCustomRun(url: string): Promise<Launch & { borders?: BordersPlan }> {
  const u = new URL(url);
  const competitor = u.hostname.replace(/^www\./, "");
  const pages = [u.pathname || "/"];
  const stamp = stampNow();
  const r = await launch({ competitor, url: u.origin, pages, jobs: ["surface", "benchmark", "reveal"], category: "demo", runId: `custom-parse-${stamp}` }, `web-custom-parse-${stamp}`);
  return r.runId ? { ...r, borders: { competitor, url: u.origin, pages, runId: `custom-borders-${stamp}`, category: "demo" } } : r;
}

/** The whole site: map it over plain fetch, rank the pages, open the best ones in parallel browsers. */
export async function launchSiteRun(url: string, maxPages = 400): Promise<Launch & { borders?: BordersPlan }> {
  const u = new URL(url);
  const competitor = u.hostname.replace(/^www\./, "");
  const stamp = stampNow();
  const r = await launch({ competitor, url: u.origin, pages: [u.pathname || "/"], jobs: ["map"], maxPages, capUsd: 60, category: "demo", runId: `site-parse-${stamp}` }, `web-site-parse-${stamp}`);
  return r.runId ? { ...r, borders: { competitor, url: u.origin, pages: [u.pathname || "/"], runId: `site-borders-${stamp}`, category: "demo" } } : r;
}

export type SiteMapView = { ready: boolean; nodes: number; edges: number; fetched: number; sitemap: boolean; pages: string[]; documents: string[] };
export const siteMap = (runId: string) => apiGet<SiteMapView>(`/runs/${runId}/map`);

/** Open the page from other countries through proxies. */
export function launchBorders(plan: BordersPlan, countries: string[] = DEMO_COUNTRIES): Promise<Launch> {
  const body: Record<string, unknown> = { competitor: plan.competitor, url: plan.url, pages: plan.pages, jobs: ["surface", "borders"], countries, runId: plan.runId };
  if (plan.category) body.category = plan.category;
  return launch(body, `web-${plan.runId}`);
}

/** Text of what a run has observed so far, for deciding whether other countries are worth a look. */
export async function observedTexts(runId: string): Promise<string[]> {
  const r = await apiGet<{ observations: Array<{ text?: string }> }>(`/runs/${runId}/observations?limit=400`);
  return (r?.observations ?? []).map((o) => o.text ?? "").filter(Boolean);
}

/** Signs on a page that the price may change with the visitor's country. Empty means: no reason to open proxies. */
const SIGNALS: Array<[RegExp, string]> = [
  [/\b(?:VAT|GST|HST|sales tax)\b|\b(?:incl|excl)(?:uding|\.)?\s+(?:of\s+)?tax/i, "tax note"],
  [/\b(?:for|in) your (?:region|country|location|local currency)\b|\blocal(?:ised|ized)? pricing\b|\bregional pricing\b/i, "region note"],
  [/\b(?:select|choose|change) (?:your )?(?:country|region|currency)\b|\bcountry\/region\b/i, "region selector"],
  [/\b(?:USD|EUR|GBP|CAD|AUD|INR|JPY|BRL)\b/, "currency code"],
];
export function regionSignals(texts: string[]): string[] {
  const found = new Set<string>();
  const symbols = new Set<string>();
  for (const t of texts) {
    for (const [re, label] of SIGNALS) if (re.test(t)) found.add(label);
    for (const m of t.matchAll(/(CA\$|US\$|A\$|R\$|\$|€|£|₹|¥)\s?\d/g)) symbols.add(m[1]);
  }
  if (symbols.size > 1) found.add(`${symbols.size} currencies (${[...symbols].join(" ")})`);
  return [...found];
}

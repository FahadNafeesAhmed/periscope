// Launching and following runs. Behaviour is the same as the v1 console: the demo site gets the full demo (read,
// sign in, countries when the page asks); any other site gets its page or the whole site. Other countries are a
// deliberate second step that opens only when the page shows region signals, or when asked.
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  apiGet, apiPost, countryName, DEMO_COUNTRIES, launchBorders, launchCustomRun, launchHelixDemo, launchSiteRun, observedTexts, regionSignals, siteMap, TARGET_URL, usePoll,
  type BordersPlan, type Handoff, type LiveSession, type RunSummary, type RunView,
} from "./api";

export type Health = { ok: boolean; steel: boolean; model: boolean };
type Pending = { plan: BordersPlan; parseRunId: string; force: boolean; polls: number; busy: boolean };

/** Is this the demo site? Only there does the saved test account exist, so only there does the sign-in run. */
export const isDemoSite = (u: string) => { try { return new URL(u).hostname === new URL(TARGET_URL).hostname; } catch { return false; } };

/** Accept "acme.com/pricing" as well as a full address. */
export const normalizeUrl = (raw: string) => {
  const t = raw.trim().replace(/\/$/, "");
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
};

export function useRunController() {
  // A failed check counts as offline, so the page can tell "offline" apart from "not checked yet" (null).
  const health = usePoll(() => apiGet<Health>("/health").then((h) => h ?? { ok: false, steel: false, model: false }), 5000);
  const sessions = usePoll(() => apiGet<{ sessions: LiveSession[] }>("/sessions").then((r) => r?.sessions ?? null), 2000);
  const handoffs = usePoll(() => apiGet<{ handoffs: Handoff[] }>("/handoffs").then((r) => r?.handoffs ?? null), 2000);
  const runs = usePoll(() => apiGet<{ runs: RunSummary[] }>("/runs?limit=30").then((r) => r?.runs ?? null), 4000);
  const connected = Boolean(health?.ok);

  const [target, setTarget] = useState(TARGET_URL);
  const [compare, setCompare] = useState(false);
  const [wholeSite, setWholeSite] = useState(false);
  const [mapRun, setMapRun] = useState<string | null>(null);
  const [followed, setFollowed] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  // Default to the latest demo runs so the brief is never empty.
  const followedRuns = useMemo(() => {
    if (followed.length) return followed;
    return (runs ?? []).filter((r) => r.competitors.includes("helix-ledger")).slice(0, 3).map((r) => r.id);
  }, [followed, runs]);

  const pending = useRef<Pending | null>(null);
  useEffect(() => {
    const id = setInterval(async () => {
      const p = pending.current;
      if (!p || p.busy) return;
      p.busy = true;
      try {
        p.polls += 1;
        let reason = "";
        const site = p.parseRunId.startsWith("site-");
        if (p.force && !site) reason = "requested";
        else {
          const [run, texts] = await Promise.all([apiGet<RunView>(`/runs/${p.parseRunId}`), observedTexts(p.parseRunId)]);
          // whole-site runs use every browser; countries wait until those browsers are free
          if (site && run && run.run.status === "running") return;
          if (p.force) reason = "requested";
          else {
            const signals = regionSignals(texts);
            if (signals.length) reason = signals.join(", ");
            else if ((run && run.run.status !== "running") || p.polls > 200) {
              pending.current = null;
              setNote("Nothing on the site suggests prices change by country, so no other countries were opened.");
              return;
            } else return;
          }
        }
        pending.current = null;
        const r = await launchBorders(p.plan);
        if (r.runId) { const rid = r.runId; setFollowed((f) => (f.includes(rid) ? f : [...f, rid])); setNote(`Opening ${DEMO_COUNTRIES.map((c) => countryName(c)).join(", ")} through proxies (${reason}).`); }
        else setNote(r.error ?? "Could not open other countries.");
      } finally {
        if (pending.current) pending.current.busy = false;
      }
    }, 3000);
    return () => clearInterval(id);
  }, []);

  // Whole-site runs: report the map as soon as discovery finishes.
  useEffect(() => {
    if (!mapRun) return;
    let stop = false;
    const id = setInterval(async () => {
      const m = await siteMap(mapRun);
      if (stop || !m) return;
      if (m.ready) {
        stop = true; clearInterval(id); setMapRun(null);
        const pricing = m.pages.find((u) => /pric|plans?\b/i.test(u));
        if (pricing && pending.current) pending.current.plan.pages = [new URL(pricing).pathname];
        setNote(`Found ${m.nodes} pages${m.sitemap ? " in the sitemap" : ""} and ${m.documents.length} documents. Reading the top ${m.pages.length} in parallel.`);
      } else if (!("ready" in m)) { stop = true; clearInterval(id); setMapRun(null); }
    }, 2500);
    return () => { stop = true; clearInterval(id); };
  }, [mapRun]);

  async function run() {
    if (busy) return;
    const url = normalizeUrl(target);
    if (!/^https?:\/\/[^/]+\.[^/]+/i.test(url)) { setNote("Enter a site address, like acme.com/pricing."); return; }
    setBusy(true);
    if (isDemoSite(url)) {
      setNote("Starting…");
      const { parse, login, borders } = await launchHelixDemo(url);
      const launched = [parse.runId, login.runId].filter((x): x is string => Boolean(x));
      const errors = [parse.error, login.error].filter((x): x is string => Boolean(x));
      if (launched.length) {
        setFollowed(launched);
        setNote(compare ? "Reading the page, signing in, and opening other countries." : "Reading the page and signing in. Other countries open if the page gives a reason.");
      }
      if (parse.runId) pending.current = { plan: borders, parseRunId: parse.runId, force: compare, polls: 0, busy: false };
      if (errors.length) setNote((n) => `${n}${n ? " · " : ""}${errors.join(" · ")}`);
    } else {
      setNote(wholeSite ? "Mapping the site…" : "Starting…");
      const r = wholeSite ? await launchSiteRun(url) : await launchCustomRun(url);
      if (r.runId) {
        setFollowed([r.runId]);
        if (wholeSite) setMapRun(r.runId);
        setNote(wholeSite ? "Mapping the site from its sitemap and links before any browser opens." : compare ? "Reading the page and opening other countries." : "Reading the page. Other countries open if the page gives a reason.");
        if (r.borders) pending.current = { plan: r.borders, parseRunId: r.runId, force: compare, polls: 0, busy: false };
      } else setNote(r.error ?? "Could not start.");
    }
    setBusy(false);
  }

  async function resume(h: Handoff) {
    const { body } = await apiPost<{ ok: boolean; reason?: string }>(`/jobs/${h.jobId}/resume`, { generation: h.generation });
    setNote(body?.ok ? "Resumed. The agent continues in the same browser." : body?.reason ?? "Resume refused.");
  }

  /** The escape hatch: cancel every followed run that is still working and release its browsers. */
  async function stop() {
    pending.current = null;
    const active = (runs ?? []).filter((r) => followedRuns.includes(r.id) && (r.status === "running" || r.status === "queued"));
    const ids = active.length ? active.map((r) => r.id) : followedRuns;
    await Promise.all(ids.map((id) => apiPost(`/runs/${id}/cancel`, {})));
    setNote("Stopped. Browsers were released; everything found so far stays in the brief.");
  }

  const url = normalizeUrl(target);
  const canRun = connected && Boolean(health?.steel) && /^https?:\/\/[^/]+\.[^/]+/i.test(url) && !/localhost|127\.0\.0\.1/.test(url);
  const plan = {
    browsers: compare ? DEMO_COUNTRIES.length + 1 : isDemoSite(url) ? 3 : wholeSite ? 50 : 1,
    minutes: wholeSite ? "2–3 min" : "about 45 s",
    demo: isDemoSite(url),
  };

  return {
    health, connected, sessions: sessions ?? [], handoffs: handoffs ?? [], runs, followedRuns,
    target, setTarget, compare, setCompare, wholeSite, setWholeSite, note, busy, canRun, plan,
    run, resume, stop,
  };
}
export type RunController = ReturnType<typeof useRunController>;

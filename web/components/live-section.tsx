"use client";
// The centre of the console: every browser the agents hold, embedded live; a collapsed trace; walls with a resume
// button; one story per run; and the intelligence beneath. Other countries open only when the page gives a reason.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  apiGet, apiPost, countryName, DEMO_COUNTRIES, launchBorders, launchCustomRun, launchHelixDemo, launchSiteRun, observedTexts, regionSignals, siteMap, TARGET_URL, usePoll,
  type BordersGrid, type BordersPlan, type CoveragePage, type Handoff, type LiveSession, type MatrixRow, type PriceRow, type RunSummary, type RunView, type StoredEvent,
} from "@/lib/api";
import { newTraceState, storyFor, storyOrder, updateTrace, type Story, type TraceState } from "@/lib/story";

type Health = { ok: boolean; steel: boolean; model: boolean };
type Pending = { plan: BordersPlan; parseRunId: string; force: boolean; polls: number; busy: boolean };

/** How many live frames show before "Show all". Each frame is a streaming player, so the page stays light. */
const PREVIEW_FRAMES = 9;

export function LiveSection({ onConnection }: { onConnection?: (connected: boolean) => void }) {
  const health = usePoll(() => apiGet<Health>("/health"), 5000);
  const connected = Boolean(health?.ok);
  useEffect(() => { onConnection?.(connected); }, [connected, onConnection]);

  const sessions = usePoll(() => apiGet<{ sessions: LiveSession[] }>("/sessions").then((r) => r?.sessions ?? null), 2000);
  const handoffs = usePoll(() => apiGet<{ handoffs: Handoff[] }>("/handoffs").then((r) => r?.handoffs ?? null), 2000);
  const runs = usePoll(() => apiGet<{ runs: RunSummary[] }>("/runs?limit=30").then((r) => r?.runs ?? null), 4000);

  const [target, setTarget] = useState(TARGET_URL);
  const [compare, setCompare] = useState(false);
  const [wholeSite, setWholeSite] = useState(false);
  const [mapRun, setMapRun] = useState<string | null>(null);
  const [followed, setFollowed] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [viewMode, setViewMode] = useState<"focus" | "grid">("focus");
  const [focusedIdx, setFocusedIdx] = useState(0);

  // Default to the latest Helix runs so the page is never empty.
  const followedRuns = useMemo(() => {
    if (followed.length) return followed;
    return (runs ?? []).filter((r) => r.competitors.includes("helix-ledger")).slice(0, 3).map((r) => r.id);
  }, [followed, runs]);

  // Browser trace, accumulated across polls.
  const traceRef = useRef<TraceState>(newTraceState());
  const [traceVersion, setTraceVersion] = useState(0);
  useEffect(() => {
    if (!sessions || !handoffs) return;
    updateTrace(traceRef.current, sessions, handoffs);
    setTraceVersion((v) => v + 1);
  }, [sessions, handoffs]);
  const { trace, stats } = traceRef.current;
  void traceVersion;

  // Other countries are a deliberate second step: open them when the page shows region signals, or when asked.
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
            setNote("Nothing on the site suggests prices change by country, so no country proxies were opened.");
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

  /** Is this the demo site? Only there does the saved test account exist, so only there does the sign-in run. */
  const isDemoSite = (u: string) => { try { return new URL(u).hostname === new URL(TARGET_URL).hostname; } catch { return false; } };

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
        setNote(`Site map: ${m.nodes} pages found${m.sitemap ? " (sitemap)" : ""}, ${m.documents.length} documents. Opening the top ${m.pages.length} in parallel browsers.`);
      } else if (!("ready" in m)) { stop = true; clearInterval(id); setMapRun(null); }
    }, 2500);
    return () => { stop = true; clearInterval(id); };
  }, [mapRun]);

  /** One button. The demo site gets the full demo (read, sign in, countries when the page asks); any other site gets its page, or the whole site. */
  async function run() {
    if (busy) return;
    const url = target.trim().replace(/\/$/, "");
    if (!/^https?:\/\//i.test(url)) { setNote("Enter a full address starting with https://"); return; }
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
        setNote(wholeSite ? "Mapping the site: reading its sitemap and links before any browser opens." : compare ? "Reading the page and opening other countries." : "Reading the page. Other countries open if the page gives a reason.");
        if (r.borders) pending.current = { plan: r.borders, parseRunId: r.runId, force: compare, polls: 0, busy: false };
      } else setNote(r.error ?? "Could not start.");
    }
    setBusy(false);
  }
  async function resume(h: Handoff) {
    const { body } = await apiPost<{ ok: boolean; reason?: string }>(`/jobs/${h.jobId}/resume`, { generation: h.generation });
    setNote(body?.ok ? `Resumed job ${h.jobId.slice(0, 8)}.` : body?.reason ?? "Resume refused.");
  }

  const disabled = !/^https?:\/\//i.test(target.trim()) || /localhost|127\.0\.0\.1/.test(target) || !health?.steel;
  const live = sessions ?? [];
  const shown = showAll ? live : live.slice(0, PREVIEW_FRAMES);
  const hidden = live.length - shown.length;
  const cols = shown.length > 9 ? 4 : shown.length >= 5 ? 3 : shown.length > 1 ? 2 : 1;
  const status = note || (connected ? (health?.steel ? "Ready." : "Browsers are unavailable right now.") : "Periscope is offline right now.");

  return (
    <section id="live" className="console-section live-section" aria-labelledby="live-title">
      <div className="hero-row">
        <img src="/periscope_marketing_banner.svg" alt="Periscope" className="hero-banner" />
        <div className="hero-main">
          <div className="console-section-title">
            <div>
              <h2 id="live-title">Competitive intelligence,<br /><span className="muted">with evidence.</span></h2>
            </div>
            <p>Enter a competitor&apos;s URL. Periscope opens real browsers that click, sign in, and view the page from different countries, then extracts every price, feature, and plan it finds.</p>
          </div>

      <div className="launcher launcher-flush">
        <div className="launcher-row">
          <div>
            <input id="helix-target" type="url" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Enter a competitor's URL" />
            <button type="button" className="primary-action" disabled={disabled || busy} onClick={run}>{busy ? "Running…" : "Analyze"}</button>
          </div>
          <label className="check-row"><input type="checkbox" checked={wholeSite} onChange={(e) => setWholeSite(e.target.checked)} /> Scan entire site<span className="check-hint">Maps every page, then opens the top 50 in parallel</span></label>
          <label className="check-row"><input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} /> Compare pricing across countries<span className="check-hint">Opens the same page from {DEMO_COUNTRIES.map((c) => countryName(c)).join(", ")}, etc.</span></label>
          {!disabled && !busy && target.trim().length > 10 && (
            <div className="run-plan">
              <span>Plan:</span> Open {wholeSite ? "up to 50 pages" : "this page"} in {compare ? `${DEMO_COUNTRIES.length + 1} browsers (home + ${DEMO_COUNTRIES.join(", ")})` : isDemoSite(target) ? "3 browsers (read, sign in, then countries if needed)" : "1 browser"}{wholeSite ? ", map the site first" : ""}. Takes ~{wholeSite ? "2–3 min" : "45 sec"}. The target sees normal browser traffic.
            </div>
          )}
          <p aria-live="polite">{status}</p>
        </div>
      </div>
        </div>
      </div>

      <Intelligence runIds={followedRuns} />

      <details className="evidence-section" open={live.length > 0 || undefined}>
        <summary className="evidence-toggle">
          <span>Live browsers</span>
          <span className="chips-inline">
            {live.length > 0 && <><b>{live.length}</b> active</>}
            {stats.countries.size > 0 && <> · <b>{stats.countries.size}</b> countries</>}
          </span>
        </summary>

      <div className="live-layout">
        <div className="browser-wall">
          {live.length === 0 && <div className="empty-state">No browsers open yet. Enter a URL and press Analyze.</div>}
          {live.length > 0 && (
            <div className="view-toggle">
              <button type="button" aria-pressed={viewMode === "focus"} onClick={() => setViewMode("focus")}>Focus</button>
              <button type="button" aria-pressed={viewMode === "grid"} onClick={() => setViewMode("grid")}>Grid</button>
              {viewMode === "focus" && live.length > 1 && <span className="muted">{Math.min(focusedIdx + 1, live.length)} of {live.length}</span>}
            </div>
          )}
          {viewMode === "focus" && live.length > 0 ? (() => {
            const idx = Math.min(focusedIdx, live.length - 1);
            const s = live[idx];
            return (
              <div className="focus-view">
                <figure className="browser-frame browser-frame-focus">
                  <figcaption>
                    <div className="frame-primary">
                      <strong>{s.competitor ?? ""}</strong>
                      <span className="frame-context">{s.vantage.country ? countryName(s.vantage.country) : ""}{s.accountRef ? " · signed in" : ""}</span>
                      {s.pendingWall && <span className="tag warn">needs human</span>}
                    </div>
                    <small>{(s.currentUrl ?? "").slice(0, 100)}</small>
                  </figcaption>
                  <iframe title={`Browser session ${s.sessionId}`} src={s.playerUrl} allow="clipboard-read; clipboard-write" referrerPolicy="no-referrer" />
                  <div className="frame-foot"><span className="mono">{s.sessionId.slice(0, 8)}</span> · <a href={s.viewerUrl} target="_blank" rel="noreferrer">open live view</a></div>
                </figure>
                {live.length > 1 && (
                  <div className="focus-selector">
                    {live.map((sess, i) => (
                      <button key={sess.sessionId} type="button" className={`focus-thumb${i === idx ? " active" : ""}`} onClick={() => setFocusedIdx(i)}>
                        <strong>{sess.competitor ?? "Browser"}</strong>
                        <span>{sess.vantage.country ? countryName(sess.vantage.country) : sess.purpose ?? "session"}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })() : viewMode === "grid" ? (
            <div className="browser-grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {shown.map((s) => (
                <figure key={s.sessionId} className="browser-frame">
                  <figcaption>
                    <div className="frame-primary">
                      <strong>{s.competitor ?? ""}</strong>
                      <span className="frame-context">{s.vantage.country ? countryName(s.vantage.country) : ""}{s.accountRef ? " · signed in" : ""}</span>
                      {s.pendingWall && <span className="tag warn">needs human</span>}
                    </div>
                    <small>{(s.currentUrl ?? "").slice(0, 80)}</small>
                  </figcaption>
                  <iframe title={`Browser session ${s.sessionId}`} src={s.playerUrl} allow="clipboard-read; clipboard-write" referrerPolicy="no-referrer" />
                  <div className="frame-foot"><span className="mono">{s.sessionId.slice(0, 8)}</span> · <a href={s.viewerUrl} target="_blank" rel="noreferrer">open live view</a></div>
                </figure>
              ))}
            </div>
          ) : null}
          {viewMode === "grid" && live.length > PREVIEW_FRAMES && (
            <button type="button" className="secondary-action show-all" onClick={() => setShowAll((v) => !v)}>
              {showAll ? `Show fewer (first ${PREVIEW_FRAMES})` : `Show all ${live.length} browsers (${hidden} more)`}
            </button>
          )}
        </div>

        <aside className="live-side">
          {(handoffs ?? []).map((h) => (
            <div key={h.jobId} className="wall-card">
              <div className="wall-label">{h.wall.toUpperCase()} wall · <span className="mono">{h.jobId.slice(0, 8)}</span></div>
              <p>Clear it in the live frame, then resume. <a href={h.viewerUrl} target="_blank" rel="noreferrer">Open live view</a></p>
              <button type="button" className="secondary-action" onClick={() => resume(h)}>I cleared it, resume</button>
            </div>
          ))}
          <div className="panel-caption">What the agents are doing</div>
          {followedRuns.length === 0 && <p className="muted">Start a run to follow it here.</p>}
          {[...followedRuns].sort((a, b) => storyOrder(a) - storyOrder(b)).map((id) => <StoryCard key={id} runId={id} />)}
          <details className="trace-panel">
            <summary>Browser trace<span>{trace.length ? ` · ${trace.length} events` : ""}</span></summary>
            <ol className="trace-log">
              {trace.length === 0 && <li className="muted">Waiting for the first browser.</li>}
              {[...trace].reverse().slice(0, 40).map((t, i) => <li key={i} className={t.kind}><span className="mono">{t.at}</span>{t.text}</li>)}
            </ol>
          </details>
        </aside>
      </div>
      </details>
    </section>
  );
}

function StoryCard({ runId }: { runId: string }) {
  const story = usePoll<Story>(async () => {
    const [run, ev] = await Promise.all([apiGet<RunView>(`/runs/${runId}`), apiGet<{ events: StoredEvent[] }>(`/runs/${runId}/events?format=json`)]);
    return run?.ok ? storyFor(run, ev?.events ?? []) : null;
  }, 3000, [runId]);
  if (!story) return null;
  return (
    <div className="story">
      <div className="story-head">
        <span className="tag">{story.kind}</span>
        <strong>{story.competitor}</strong>
        <span className="muted">{story.status}</span>
      </div>
      {story.lines.map((l, i) => <p key={i} className={`story-line ${l.tone}`} dangerouslySetInnerHTML={{ __html: l.html }} />)}
      {story.badges.length > 0 && <div className="story-badges">{story.badges.map((b) => <span key={b} className="tag steel">{b}</span>)}</div>}
    </div>
  );
}

function copyText(text: string, setter: (msg: string) => void) {
  navigator.clipboard.writeText(text).then(() => setter("Copied!"), () => setter("Copy failed"));
  setTimeout(() => setter(""), 2000);
}

function Intelligence({ runIds }: { runIds: string[] }) {
  const [tab, setTab] = useState<"coverage" | "countries" | "prices" | "matrix">("coverage");
  const [copyMsg, setCopyMsg] = useState("");
  const [briefOpen, setBriefOpen] = useState(false);
  const key = runIds.join(",");
  const data = usePoll(async () => {
    const out = { coverage: [] as CoveragePage[], grids: [] as BordersGrid[], prices: [] as PriceRow[], matrix: [] as MatrixRow[], note: "" };
    for (const id of runIds) {
      const [c, b, p, m] = await Promise.all([
        apiGet<{ pages: CoveragePage[] }>(`/runs/${id}/coverage`), apiGet<{ grids: BordersGrid[] }>(`/runs/${id}/borders`),
        apiGet<{ rows: PriceRow[] }>(`/runs/${id}/prices`), apiGet<{ rows: MatrixRow[]; note?: string }>(`/runs/${id}/matrix`),
      ]);
      out.coverage.push(...(c?.pages ?? [])); out.grids.push(...(b?.grids ?? [])); out.prices.push(...(p?.rows ?? [])); out.matrix.push(...(m?.rows ?? [])); out.note = out.note || m?.note || "";
    }
    return out;
  }, 10000, [key]);

  const hasData = data && ((tab === "coverage" && data.coverage.length) || (tab === "countries" && data.grids.length) || (tab === "prices" && data.prices.length) || (tab === "matrix" && data.matrix.length));

  function copyTable() {
    if (!data) return;
    let text = "";
    if (tab === "prices") text = ["Country\tAmount\tCurrency\tPeriod\tText", ...data.prices.map((r) => `${countryName(r.country) ?? "home"}\t${r.amount}\t${r.currency ?? ""}\t${r.period ?? ""}\t${r.text}`)].join("\n");
    else if (tab === "matrix") text = ["Competitor\tFeature\tStatus\tValue", ...data.matrix.map((r) => `${r.competitor}\t${r.feature}\t${r.status}\t${r.value ?? ""}`)].join("\n");
    else if (tab === "coverage") text = ["Page\tFetch saw\tRevealed\tMissed", ...data.coverage.map((p) => `${p.url}\t${p.surface}\t${p.hidden}\t${p.counter}`)].join("\n");
    else if (tab === "countries") text = data.grids.map((g) => `${g.url}\n${g.countries.map((c) => `  ${countryName(c.country)}: ${c.prices.join("; ")}`).join("\n")}`).join("\n\n");
    copyText(text, setCopyMsg);
  }

  const anyData = data && (data.prices.length || data.matrix.length || data.grids.length || data.coverage.length);

  function generateBrief(): string {
    if (!data) return "";
    const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    const competitors = [...new Set(data.matrix.map((r) => r.competitor).filter(Boolean))];
    const sections: string[] = [];
    sections.push(`# Competitive Brief — ${date}`);
    sections.push(`Generated by Periscope\n`);
    if (competitors.length) sections.push(`**Competitors analyzed:** ${competitors.join(", ")}\n`);
    if (data.prices.length) {
      sections.push(`## Pricing`);
      const byCountry = new Map<string, typeof data.prices>();
      for (const r of data.prices) { const k = countryName(r.country) ?? "Home"; byCountry.set(k, [...(byCountry.get(k) ?? []), r]); }
      for (const [country, rows] of byCountry) {
        sections.push(`### ${country}`);
        for (const r of rows.slice(0, 15)) sections.push(`- ${r.amount} ${r.currency ?? ""} ${r.period ?? ""} — ${r.text}`);
      }
      sections.push("");
    }
    if (data.grids.length) {
      const diff = data.grids.filter((g) => g.differsByCountry);
      if (diff.length) {
        sections.push(`## Country Differences`);
        for (const g of diff) {
          sections.push(`**${g.url.replace(/^https?:\/\//, "")}** — pricing varies by country`);
          for (const c of g.countries) sections.push(`- ${countryName(c.country)}: ${c.prices.slice(0, 3).join("; ")}`);
        }
        sections.push("");
      }
    }
    if (data.matrix.length) {
      sections.push(`## Feature Matrix`);
      for (const r of data.matrix.slice(0, 20)) sections.push(`- **${r.feature}**: ${r.status}${r.value ? ` (${r.value})` : ""}`);
      sections.push("");
    }
    if (data.coverage.length) {
      const totalRevealed = data.coverage.reduce((s, p) => s + p.hidden, 0);
      const totalMissed = data.coverage.reduce((s, p) => s + Number(p.counter), 0);
      sections.push(`## Coverage Summary`);
      sections.push(`- ${data.coverage.length} pages analyzed`);
      sections.push(`- ${totalRevealed} facts revealed, ${totalMissed} missed by a simple fetch`);
      sections.push("");
    }
    sections.push(`---\n*Generated by Periscope — browser agents that read what the web hides*`);
    return sections.join("\n");
  }

  const tabs: Array<[typeof tab, string]> = [["coverage", "Coverage"], ["countries", "Countries"], ["prices", "Prices"], ["matrix", "Feature matrix"]];
  return (
    <div className="intel">
      <div className="intel-header">
        <div className="panel-caption">What Periscope learned</div>
        {anyData && <div className="intel-actions">
          <button type="button" className="copy-btn" onClick={copyTable}>{copyMsg || "Copy table"}</button>
          <button type="button" className="brief-btn" onClick={() => setBriefOpen(!briefOpen)}>{briefOpen ? "Hide brief" : "Generate brief"}</button>
        </div>}
      </div>
      {briefOpen && anyData && (() => {
        const brief = generateBrief();
        return (
          <div className="brief-panel">
            <div className="brief-actions">
              <button type="button" className="copy-btn" onClick={() => copyText(brief, setCopyMsg)}>{copyMsg || "Copy brief"}</button>
            </div>
            <pre className="brief-content">{brief}</pre>
          </div>
        );
      })()}
      <div className="view-controls" aria-label="Intelligence views">{tabs.map(([id, label]) => <button type="button" key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}</div>
      <div className="table-region" role="region" tabIndex={0}>
        {!runIds.length && <p className="muted">Nothing yet. Enter a URL above and press Analyze.</p>}
        {tab === "coverage" && data && (data.coverage.length ? <table><thead><tr><th>Page</th><th>Fetch saw</th><th>Revealed</th><th>Missed by fetch</th><th>Documents</th><th>Vantages</th><th>Revealed by</th></tr></thead><tbody>{data.coverage.map((p, i) => <tr key={p.url + i}><td>{p.url.replace(/^https?:\/\//, "")}</td><td>{p.surface}</td><td>{p.hidden}</td><td className="accent">{p.counter}</td><td>{p.documents}</td><td>{p.vantages.length}</td><td>{Object.entries(p.byAction).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} (${v})`).join(", ")}</td></tr>)}</tbody></table> : <p className="muted">No pages yet.</p>)}
        {tab === "countries" && data && (data.grids.length ? data.grids.map((g) => (
          <div key={g.url} className="grid-block">
            <div className="muted">{g.url.replace(/^https?:\/\//, "")} · differs by country: <b>{g.differsByCountry ? "yes" : "no"}</b> · by device: <b>{g.differsByDevice ? "yes" : "no"}</b></div>
            <div className="country-cols">{g.countries.map((c) => (
              <div key={c.country}><div className="country-head"><strong>{countryName(c.country) ?? c.country}</strong> <span className="tag steel">via proxy</span></div>
                {c.prices.slice(0, 6).map((l, i) => <div key={i} className="line price">{l.slice(0, 110)}</div>)}
                {c.uniqueToCountry.filter((l) => !c.prices.includes(l)).slice(0, 4).map((l, i) => <div key={i} className="line">{l.slice(0, 110)}</div>)}
              </div>))}</div>
          </div>)) : <p className="muted">No country comparison yet. It runs when the page gives a reason, or when you tick the box above.</p>)}
        {tab === "prices" && data && (data.prices.length ? <table><thead><tr><th>Country</th><th>Device</th><th>Amount</th><th>Currency</th><th>Period</th><th>Text</th><th>Layer</th><th></th></tr></thead><tbody>{data.prices.slice(0, 80).map((r) => <tr key={r.observationId}><td>{countryName(r.country) ?? "home"}</td><td>{r.device}</td><td className="accent">{r.amount}</td><td>{r.currency ?? ""}</td><td>{r.period ?? ""}</td><td>{r.text.slice(0, 90)}</td><td>{r.layer}</td><td><button type="button" className="row-copy" onClick={() => copyText(`${r.amount} ${r.currency ?? ""} ${r.period ?? ""} (${countryName(r.country) ?? "home"}) — ${r.text}`, setCopyMsg)}>Copy</button></td></tr>)}</tbody></table> : <p className="muted">No price lines yet.</p>)}
        {tab === "matrix" && data && (data.matrix.length ? <table><thead><tr><th>Competitor</th><th>Feature</th><th>Status</th><th>Value</th><th>Evidence</th><th></th></tr></thead><tbody>{data.matrix.map((r) => <tr key={r.id}><td>{r.competitor}</td><td>{r.feature}</td><td>{r.status}</td><td>{(r.value ?? "").slice(0, 100)}</td><td>{r.evidence.length}</td><td><button type="button" className="row-copy" onClick={() => copyText(`${r.competitor}: ${r.feature} — ${r.status}${r.value ? ` (${r.value})` : ""}`, setCopyMsg)}>Copy</button></td></tr>)}</tbody></table> : <p className="muted">{data.note || "The matrix fills a minute after a run completes."}</p>)}
      </div>
    </div>
  );
}

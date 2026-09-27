"use client";
import { Fragment, useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ExternalLink } from "@/components/icons";
import benchmark from "@/public/benchmark/summary.json";

type Metric = "material" | "reported";
type Group = (typeof benchmark.groups)[number];

// Where each planted fact lives on Helix Ledger: in the page source, behind a click, or behind the login.
const LOGIN = /dashboard|billing|report/i;
const bandOf = (g: Group) => (LOGIN.test(g.name) ? "Behind the login" : g.fetch[0] === g.total ? "In the page source" : "Behind clicks and toggles");
const BANDS = ["In the page source", "Behind clicks and toggles", "Behind the login"];

const COLUMNS: Array<{ key: "fetch" | "reader" | "chatgpt" | "periscope"; label: string }> = [
  { key: "fetch", label: "Claude + fetch" },
  { key: "reader", label: "Claude + Parallel" },
  { key: "chatgpt", label: "ChatGPT" },
  { key: "periscope", label: "Periscope" },
];

export default function BenchmarkPage() {
  const [metric, setMetric] = useState<Metric>("material");
  const idx = metric === "material" ? 0 : 1;
  const cell = (g: Group, k: (typeof COLUMNS)[number]["key"]) => (k === "chatgpt" ? g.chatgpt : g[k][idx]);
  const bandTotals = BANDS.map((band) => {
    const gs = benchmark.groups.filter((g) => bandOf(g) === band);
    return { band, total: gs.reduce((s, g) => s + g.total, 0), by: Object.fromEntries(COLUMNS.map((c) => [c.key, gs.reduce((s, g) => s + cell(g, c.key), 0)])) as Record<string, number> };
  });
  const clicks = bandTotals.find((b) => b.band === BANDS[1]);
  const login = bandTotals.find((b) => b.band === BANDS[2]);

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <SiteHeader home={false} />
      <main id="main" className="bench">
        <div className="section-inner">
          <p className="kicker">Benchmark · {new Date(benchmark.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}</p>
          <h1>65 planted facts. How many made it back?</h1>
          <p className="section-lede">
            We built Helix Ledger, a small SaaS site, and planted 65 facts in it: some in the page source, some behind toggles, modals and dropdowns, and some only visible after signing in. Then we pointed four approaches at it and counted what each one brought back.
          </p>

          <div className="bench-top">
            <div>
              <div className="segmented" role="group" aria-label="What to count">
                <button type="button" aria-pressed={metric === "material"} onClick={() => setMetric("material")}>Facts collected</button>
                <button type="button" aria-pressed={metric === "reported"} onClick={() => setMetric("reported")}>Facts Claude reported</button>
              </div>
              <ol className="bars bars-large">
                {benchmark.approaches.map((a, i) => {
                  const v = a[metric];
                  return (
                    <li key={a.name} className={i === 0 ? "ours" : undefined}>
                      <span className="bar-label">{a.name}</span>
                      <span className="bar-value">{v ?? "n/a"}{v !== null && <span className="muted"> / {benchmark.total}</span>}</span>
                      <span className="bar-track" aria-hidden="true"><span style={{ width: `${((v ?? 0) / benchmark.total) * 100}%` }} /></span>
                    </li>
                  );
                })}
              </ol>
            </div>
            <div className="bench-notes">
              <h2>How to read this</h2>
              <p><b>Facts collected</b> counts planted facts present anywhere in the material each approach gathered. <b>Facts Claude reported</b> counts what Claude Opus 4.8 wrote down after reading that material.</p>
              <p>ChatGPT with browsing was scored by hand on its own answer, so it has no second number. It stopped at the login.</p>
              {clicks && login && (
                <p>Behind clicks and toggles, ChatGPT did slightly better than Periscope ({clicks.by.chatgpt} against {clicks.by.periscope} of {clicks.total}). Periscope&apos;s lead is behind the login: {login.by.periscope} of {login.total}, against {login.by.chatgpt}.</p>
              )}
            </div>
          </div>

          <h2 className="bench-h2">Where the facts were</h2>
          <div className="table-wrap" role="region" aria-label="Results by rubric group" tabIndex={0}>
            <table className="bench-table">
              <thead>
                <tr><th>Rubric group</th><th className="num">Planted</th>{COLUMNS.map((c) => <th key={c.key} className={`num${c.key === "periscope" ? " ours" : ""}`}>{c.label}</th>)}</tr>
              </thead>
              <tbody>
                {bandTotals.map(({ band, total, by }) => (
                  <Fragment key={band}>
                    <tr className="band">
                      <th scope="rowgroup">{band}</th>
                      <td className="num">{total}</td>
                      {COLUMNS.map((c) => <td key={c.key} className={`num${c.key === "periscope" ? " ours" : ""}`}>{by[c.key]}</td>)}
                    </tr>
                    {benchmark.groups.filter((g) => bandOf(g) === band).map((g) => (
                      <tr key={g.name}>
                        <td>{g.name}</td>
                        <td className="num muted">{g.total}</td>
                        {COLUMNS.map((c) => {
                          const v = cell(g, c.key);
                          return <td key={c.key} className={`num${c.key === "periscope" ? " ours" : ""}${v === 0 ? " zero" : ""}`}>{v}</td>;
                        })}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bench-method">
            <h2>Method and limits</h2>
            <p>Matching uses case-insensitive substrings of the planted text; an integration status needs both its name and its status. The ChatGPT column is the hand-scored answer in both views. This is a controlled test on one site we built, not a general ranking of research tools.</p>
            <p className="bench-links">
              <a className="text-link" href="/benchmark/results-2026-09-13-14-16.md">Original report <ExternalLink size={12} /></a>
              <a className="text-link" href="/benchmark/helix-rubric.json">Rubric <ExternalLink size={12} /></a>
              <a className="text-link" href="/benchmark/manual-results.json">ChatGPT scoring <ExternalLink size={12} /></a>
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

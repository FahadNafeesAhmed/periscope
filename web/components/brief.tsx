"use client";
// The brief: what a founder or investor takes into a pricing review, a board meeting or an IC memo. Findings first,
// then the tables behind them. A highlighted fact is one a plain fetch (and a chatbot reading page source) missed.
import { useState } from "react";
import { countryName } from "@/lib/api";
import { briefMarkdown, findingsFor, hostOf, moneyIn, pathOf, pricesCsv, relTime, revealPhrase, shortDate, type BriefData, type Finding } from "@/lib/brief";
import { Check, Copy, Download } from "./icons";

export function Brief({ data, sample, children }: { data: BriefData; sample: boolean; children?: React.ReactNode }) {
  const findings = findingsFor(data);
  const pages = new Set([...data.coverage.map((c) => c.url), ...data.hidden.map((o) => o.url)]).size;
  const countries = new Set(data.grids.flatMap((g) => g.countries.map((c) => c.country))).size;
  const facts = [
    pages ? `${pages} page${pages === 1 ? "" : "s"} read` : null,
    countries ? `${countries} countries compared` : null,
    data.inside.length ? "signed in as a customer" : null,
    data.hidden.length ? `${data.hidden.length} facts missed by a plain fetch` : null,
  ].filter(Boolean);
  const name = prettyName(data.competitor);

  return (
    <article className="brief" aria-labelledby="brief-title">
      <header className="brief-head">
        <div className="brief-meta">
          {sample ? <span className="pill">Sample brief</span> : data.running ? <span className="pill live"><i aria-hidden="true" />Agents still working</span> : <span className="pill">Updated {relTime(data.updatedAt)}</span>}
          {data.origin && <a href={data.origin} target="_blank" rel="noreferrer" className="brief-origin">{hostOf(data.origin)}</a>}
        </div>
        <h2 id="brief-title">{name}</h2>
        {facts.length > 0 && <p className="brief-facts">{facts.join(" · ")}</p>}
        <BriefActions data={data} findings={findings} name={name} />
        {sample && <p className="sample-note">A brief from our test run on Helix Ledger, a SaaS site built for the benchmark. Run Periscope on any competitor to get your own.</p>}
      </header>

      {findings.length > 0 && (
        <section className="brief-section" aria-labelledby="findings-title">
          <div className="section-bar"><h3 id="findings-title">Key findings</h3><span className="legend"><mark>Highlighted</mark> = missed by a plain fetch</span></div>
          <ol className="findings">{findings.map((f) => <FindingItem key={f.id} f={f} />)}</ol>
        </section>
      )}

      <Pricing data={data} />
      <Changes data={data} />
      <Hidden data={data} />
      <Inside data={data} />
      <Features data={data} />
      {children}
      <Sources data={data} />
    </article>
  );
}

export const prettyName = (id: string) => {
  if (!id) return "Competitor";
  const base = id.includes(".") ? id.split(".")[0] : id;
  return base.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
};

/** Missed-by-fetch facts get the highlighter; everything else stays plain so the highlight keeps its meaning. */
function FindingItem({ f }: { f: Finding }) {
  const marked = f.kind === "hidden" || f.kind === "inside" || f.kind === "document";
  return (
    <li className="finding">
      <p>{f.lead} {marked ? <mark>{f.fact}</mark> : <strong>{f.fact}</strong>}{f.tail}</p>
      <span className="finding-source">{f.source}</span>
    </li>
  );
}

function BriefActions({ data, findings, name }: { data: BriefData; findings: Finding[]; name: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(briefMarkdown(data, findings)).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }, () => {});
  }
  function csv() {
    const blob = new Blob([pricesCsv(data)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name.toLowerCase().replace(/\s+/g, "-")}-prices.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  return (
    <div className="brief-actions">
      <button type="button" className="button secondary" onClick={copy}>{copied ? <Check /> : <Copy />}{copied ? "Copied" : "Copy as Markdown"}</button>
      {data.prices.length > 0 && <button type="button" className="button secondary" onClick={csv}><Download />Prices as CSV</button>}
    </div>
  );
}

function Pricing({ data }: { data: BriefData }) {
  if (data.grids.length) {
    return (
      <section className="brief-section" aria-labelledby="pricing-title">
        <div className="section-bar"><h3 id="pricing-title">Pricing by country</h3><span className="section-note">Same page, opened through proxies in each country</span></div>
        {data.grids.map((g) => (
          <div key={g.url} className="country-block">
            <p className="block-caption">{pathOf(g.url)} · {g.differsByCountry ? "prices differ by country" : "same prices in every country"}{g.differsByDevice ? " · differs on mobile" : ""}</p>
            <div className="country-grid" style={{ ["--cols" as string]: g.countries.length }}>
              {g.countries.map((c) => {
                const head = c.prices.map(moneyIn).find(Boolean);
                return (
                  <div key={c.country} className="country-col">
                    <span className="country-name">{countryName(c.country) ?? c.country}</span>
                    <span className="country-price">{head ?? "—"}</span>
                    <ul>{c.prices.slice(0, 4).map((l, i) => <li key={i}>{l}</li>)}</ul>
                    {c.uniqueToCountry.filter((l) => !c.prices.includes(l)).slice(0, 2).map((l, i) => <p key={i} className="only-here">Only here: {l}</p>)}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    );
  }
  if (!data.prices.length) return null;
  return (
    <section className="brief-section" aria-labelledby="pricing-title">
      <div className="section-bar"><h3 id="pricing-title">Pricing</h3><span className="section-note">Every price line the agents saw</span></div>
      <ul className="price-list">
        {data.prices.slice(0, 24).map((r) => (
          <li key={r.observationId}>
            <span className="price-amount">{moneyIn(r.text) ?? r.amount}</span>
            <span className="price-text">{r.text}</span>
            <span className="price-where">{pathOf(r.url)}{r.country ? ` · ${countryName(r.country)}` : ""}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Changes({ data }: { data: BriefData }) {
  const d = data.diff;
  if (!d || !data.diffFrom || (!d.added.length && !d.removed.length)) return null;
  return (
    <section className="brief-section" aria-labelledby="changes-title">
      <div className="section-bar"><h3 id="changes-title">Changed since {shortDate(data.diffFrom.createdAt)}</h3><span className="section-note">{d.unchanged} lines unchanged</span></div>
      <ul className="diff">
        {d.removed.slice(0, 8).map((l, i) => <li key={`r${i}`} className="removed"><span aria-label="Removed">−</span>{l.text}<small>{pathOf(l.url)}</small></li>)}
        {d.added.slice(0, 8).map((l, i) => <li key={`a${i}`} className="added"><span aria-label="Added">+</span>{l.text}<small>{pathOf(l.url)}</small></li>)}
      </ul>
    </section>
  );
}

function Hidden({ data }: { data: BriefData }) {
  if (!data.hidden.length) return null;
  const byPage = new Map<string, typeof data.hidden>();
  for (const o of data.hidden) byPage.set(pathOf(o.url), [...(byPage.get(pathOf(o.url)) ?? []), o]);
  return (
    <section className="brief-section" aria-labelledby="hidden-title">
      <div className="section-bar"><h3 id="hidden-title">Behind clicks and toggles</h3><span className="section-note">Not in the page source, so a fetch or a chatbot never sees it</span></div>
      {[...byPage.entries()].map(([page, rows]) => (
        <div key={page} className="evidence-group">
          <p className="block-caption">{page}</p>
          <ul className="evidence-list">
            {rows.slice(0, 12).map((o) => (
              <li key={o.id}>
                <span>{o.kind === "document" ? o.text.split("/").pop() : o.text}</span>
                <span className="how">{revealPhrase(o)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function Inside({ data }: { data: BriefData }) {
  if (!data.inside.length) return null;
  return (
    <section className="brief-section" aria-labelledby="inside-title">
      <div className="section-bar"><h3 id="inside-title">Behind the login</h3><span className="section-note">Seen from a customer account; the password stayed in the vault</span></div>
      <ul className="evidence-list">
        {data.inside.slice(0, 12).map((o) => <li key={o.id}><span>{o.text}</span><span className="how">{pathOf(o.url)}</span></li>)}
      </ul>
    </section>
  );
}

function Features({ data }: { data: BriefData }) {
  if (!data.matrix.length) return null;
  return (
    <section className="brief-section" aria-labelledby="features-title">
      <div className="section-bar"><h3 id="features-title">Features and plans</h3><span className="section-note">Extracted by Claude; each row cites the lines it came from</span></div>
      <div className="table-wrap" role="region" aria-labelledby="features-title" tabIndex={0}>
        <table>
          <thead><tr><th>Feature</th><th>Status</th><th>Detail</th><th className="num">Sources</th></tr></thead>
          <tbody>
            {data.matrix.map((r) => (
              <tr key={r.id}>
                <td>{r.feature}</td>
                <td><span className={`status ${r.status}`}>{STATUS[r.status] ?? r.status}</span></td>
                <td className="muted">{r.value ?? "—"}</td>
                <td className="num">{r.evidence.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
const STATUS: Record<string, string> = { observed: "Offered", limited: "Limited", absent: "Not found", uncertain: "Unclear" };

function Sources({ data }: { data: BriefData }) {
  if (!data.coverage.length) return null;
  return (
    <section className="brief-section sources" aria-labelledby="sources-title">
      <div className="section-bar"><h3 id="sources-title">How this was gathered</h3></div>
      <div className="table-wrap" role="region" aria-labelledby="sources-title" tabIndex={0}>
        <table>
          <thead><tr><th>Page</th><th className="num">In page source</th><th className="num">Found by interacting</th><th>Revealed by</th></tr></thead>
          <tbody>
            {data.coverage.map((p, i) => (
              <tr key={p.url + i}>
                <td>{pathOf(p.url)}</td>
                <td className="num">{p.surface}</td>
                <td className="num">{p.hidden}</td>
                <td className="muted">{Object.entries(p.byAction).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k).join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

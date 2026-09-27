"use client";
import { useBrief } from "@/lib/brief";
import { useRunController, type RunController } from "@/lib/run-controller";
import { BENCHMARK, BENCHMARK_TOTAL, SAMPLE_BRIEF } from "@/lib/sample";
import { AgentRail } from "./agents";
import { Brief } from "./brief";
import { ArrowRight } from "./icons";
import { SiteFooter, SiteHeader, type AgentStatus } from "./site-chrome";

export function Console() {
  const rc = useRunController();
  const data = useBrief(rc.followedRuns, rc.runs);
  const working = (rc.runs ?? []).some((r) => rc.followedRuns.includes(r.id) && (r.status === "running" || r.status === "queued"));
  const status: AgentStatus = rc.health === null ? "unknown" : !rc.connected || !rc.health.steel ? "offline" : working ? "busy" : "ready";
  const loading = rc.connected && rc.followedRuns.length > 0 && !data;

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <SiteHeader status={status} />
      <main id="main">
        <Hero rc={rc} status={status} />
        <section id="brief" className="workspace" aria-label="Brief">
          <div className="workspace-inner">
            {loading ? <div className="brief brief-loading"><p>Loading the latest brief…</p></div> : <Brief data={data ?? SAMPLE_BRIEF} sample={!data} />}
            <AgentRail rc={rc} />
          </div>
        </section>
        <WhyNotChatGPT />
        <HowItWorks />
      </main>
      <SiteFooter />
    </>
  );
}

function Hero({ rc, status }: { rc: RunController; status: AgentStatus }) {
  const { plan } = rc;
  const planText = plan.demo
    ? `Reads 3 pages and signs in with a test account${rc.compare ? ", then opens 3 countries" : ""}`
    : rc.wholeSite
      ? `Maps the site, then reads up to 50 pages at once${rc.compare ? ", then opens 3 countries" : ""}`
      : `Reads this page${rc.compare ? " from 4 places: here, Canada, the US and Germany" : ""}`;
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-inner">
        <div className="hero-copy">
          <p className="kicker">For pricing reviews, board prep and diligence</p>
          <h1 id="hero-title">What your competitors charge. <span>Including what they hide.</span></h1>
          <p className="lede">Paste a competitor&apos;s site. Periscope&apos;s browser agents flip every pricing toggle, visit from other countries and sign in like a customer, then hand you a brief with a source for every number.</p>

          <form className="launcher" onSubmit={(e) => { e.preventDefault(); void rc.run(); }}>
            <label htmlFor="target" className="visually-hidden">Competitor site</label>
            <div className="launcher-field">
              <input id="target" type="text" inputMode="url" autoComplete="url" spellCheck={false} value={rc.target} onChange={(e) => rc.setTarget(e.target.value)} placeholder="competitor.com/pricing" />
              <button type="submit" className="button primary" disabled={!rc.canRun || rc.busy}>{rc.busy ? "Starting…" : "Build brief"}{!rc.busy && <ArrowRight />}</button>
            </div>
            <div className="launcher-options">
              <label className="switch"><input type="checkbox" checked={rc.wholeSite} onChange={(e) => rc.setWholeSite(e.target.checked)} /><span className="switch-track" aria-hidden="true" /><span>Whole site <small>up to 50 pages</small></span></label>
              <label className="switch"><input type="checkbox" checked={rc.compare} onChange={(e) => rc.setCompare(e.target.checked)} /><span className="switch-track" aria-hidden="true" /><span>Other countries <small>Canada, US, Germany</small></span></label>
            </div>
            <p className="launcher-plan" aria-live="polite">
              {rc.note ? rc.note
                : status === "offline" ? "The agents are offline right now. Below is a sample brief from a test run."
                : status === "unknown" ? "Checking the agents…"
                : <>{planText} · {plan.minutes} · you can stop at any time</>}
            </p>
          </form>
        </div>

        <figure className="proof" aria-labelledby="proof-title">
          <figcaption id="proof-title">We planted {BENCHMARK_TOTAL} facts in a test SaaS site. How many did each tool bring back?</figcaption>
          <ol className="bars">
            {BENCHMARK.map((b, i) => (
              <li key={b.name} className={i === 0 ? "ours" : undefined}>
                <span className="bar-label">{b.name}</span>
                <span className="bar-value">{b.facts}</span>
                <span className="bar-track" aria-hidden="true"><span style={{ width: `${(b.facts / BENCHMARK_TOTAL) * 100}%` }} /></span>
              </li>
            ))}
          </ol>
          <a href="/benchmark/" className="text-link">Method and full results <ArrowRight size={14} /></a>
        </figure>
      </div>
    </section>
  );
}

function WhyNotChatGPT() {
  const missing = [
    ["Annual price", "the Monthly / Annual toggle was never clicked"],
    ["Volume pricing", "it sits behind a seat-count dropdown"],
    ["Prices abroad", "every visit comes from the same country"],
    ["Plan limits in use", "they're behind the login"],
  ];
  const found = [
    ["CA$26 per user per month", "billed annually, after flipping “Annual”"],
    ["From $39 per user per month", "for 100 or more seats, after choosing “100+ seats”"],
    ["$29 in the US, €31 in Germany", "same page, opened from three countries"],
    ["25 of 30 seats used", "on the dashboard, signed in with a test account"],
  ];
  return (
    <section className="why" aria-labelledby="why-title">
      <div className="section-inner">
        <h2 id="why-title">Why not just ask ChatGPT?</h2>
        <p className="section-lede">Chatbots and scrapers read the page a server sends. Pricing pages keep the interesting parts behind toggles, dropdowns, country redirects and logins, so none of it reaches the model.</p>
        <div className="compare">
          <div>
            <h3>What a scraper or chatbot reads</h3>
            <p className="compare-quote">“Starting at $39/user/month”</p>
            <ul className="compare-list missing">{missing.map(([k, v]) => <li key={k}><strong>{k}</strong>{v}</li>)}</ul>
            <p className="compare-score"><b>22</b> of 65 facts with a plain fetch · <b>38</b> for ChatGPT with browsing, which stopped at the login</p>
          </div>
          <div>
            <h3>What Periscope brings back</h3>
            <p className="compare-quote">“Starting at $39/user/month”, and:</p>
            <ul className="compare-list found">{found.map(([k, v]) => <li key={k}><mark>{k}</mark>{v}</li>)}</ul>
            <p className="compare-score"><b>63</b> of 65 facts, each with the page, country and click behind it</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    ["Reads the page like a person", "A real Chrome browser on Steel clicks every toggle, tab, dropdown and accordion, and records which action revealed each line."],
    ["Looks from other countries", "If the page hints at regional pricing, such as a currency, a tax note or a country picker, the same page opens through proxies in Canada, the US and Germany."],
    ["Signs in without seeing the password", "Credentials live in Steel's vault and are typed by the browser, never shown to the model. If a CAPTCHA appears, the browser pauses until a person clears it."],
    ["Writes the brief", "Claude turns what the browsers saw into findings. Every row keeps the page, country and click it came from, so you can defend it in the meeting."],
  ];
  return (
    <section id="how" className="how" aria-labelledby="how-title">
      <div className="section-inner">
        <h2 id="how-title">How it works</h2>
        <ol className="steps">{steps.map(([t, d]) => <li key={t}><h3>{t}</h3><p>{d}</p></li>)}</ol>
      </div>
    </section>
  );
}

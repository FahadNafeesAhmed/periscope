"use client";
import { useState } from "react";
import { Mark } from "./sections";
import { LiveSection } from "./live-section";
import { useTheme } from "./theme-provider";
import config from "@/public/console.json";
import benchmark from "@/public/benchmark/summary.json";
import snapshot from "@/public/snapshot.json";

const nodes = [
  {
    id: "target",
    label: "Helix Ledger",
    x: 360,
    y: 190,
    kind: "Page",
    description:
      "The controlled SaaS target connects public pricing with an authenticated dashboard.",
  },
  {
    id: "pricing",
    label: "Pricing",
    x: 200,
    y: 120,
    kind: "Page",
    description: "Billing and seat controls reveal different pricing facts.",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    x: 530,
    y: 135,
    kind: "Page",
    description: "Authorized access reveals the Team plan’s seat usage.",
  },
  {
    id: "annual-action",
    label: "Annual toggle",
    x: 105,
    y: 220,
    kind: "Action",
    description:
      "Switching Monthly to Annual reveals a price with annual billing context.",
  },
  {
    id: "volume-action",
    label: "100+ seats",
    x: 235,
    y: 305,
    kind: "Action",
    description: "Selecting 100+ seats reveals the volume pricing condition.",
  },
  {
    id: "login",
    label: "Authorized session",
    x: 525,
    y: 290,
    kind: "Action",
    description:
      "A signed-in session gives the walker access to the dashboard.",
  },
  {
    id: "annual",
    label: "CA$26 / user / month",
    x: 100,
    y: 350,
    kind: "Fact",
    description: snapshot.facts[0].quote,
  },
  {
    id: "volume",
    label: "From $39 / user / month",
    x: 350,
    y: 395,
    kind: "Fact",
    description: snapshot.facts[1].quote,
  },
  {
    id: "seats",
    label: "25 of 30 seats",
    x: 635,
    y: 375,
    kind: "Fact",
    description: snapshot.facts[2].quote,
  },
  {
    id: "context",
    label: "Billing + seat context",
    x: 380,
    y: 65,
    kind: "Context",
    description:
      "Conditions travel with the facts: annual billing, minimum seats, and authenticated access.",
  },
];
const links = [
  ["target", "pricing"],
  ["target", "dashboard"],
  ["pricing", "annual-action"],
  ["pricing", "volume-action"],
  ["annual-action", "annual"],
  ["volume-action", "volume"],
  ["dashboard", "login"],
  ["login", "seats"],
  ["context", "pricing"],
  ["context", "dashboard"],
  ["context", "annual"],
  ["context", "volume"],
];

export function Landing() {
  const { theme, toggle: toggleTheme } = useTheme();
  const [jobId, setJobId] = useState("reveal");
  const [nodeId, setNodeId] = useState("annual");
  const [metric, setMetric] = useState<"material" | "reported">("material");
  const [recording, setRecording] = useState(false);
  const [connected, setConnected] = useState(false);
  const job = config.jobs.find((j) => j.id === jobId)!;
  const node = nodes.find((n) => n.id === nodeId)!;
  const selectJob = (id: string) => {
    setJobId(id);
    setRecording(false);
  };
  const configuredUrl: unknown = job.playerUrl;
  const playerUrl =
    typeof configuredUrl === "string" &&
    /^(https:\/\/([a-z0-9-]+\.)*steel\.dev\/|https:\/\/api\.steel\.dev\/)/.test(
      configuredUrl,
    )
      ? configuredUrl
      : null;
  return (
    <div className="hackathon">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="console-header">
        <a className="wordmark" href="#agents">
          <Mark />
          periscope.
        </a>
        <nav aria-label="Main navigation">
          <a href="#live">Live</a>
          <a href="#results">Benchmark</a>
          <a href="https://github.com/FahadNafeesAhmed/periscope">GitHub ↗</a>
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? "☀" : "☽"}
          </button>
        </nav>
      </header>
      <main id="main">
        <section
          id="agents"
          className="console-section intro-section"
          aria-labelledby="agents-title"
        >
          {/* <div className="console-intro">
            <div>
              <h1 id="agents-title">
                Know what your competitors hide.
                <br />
                <span>Before they know you&apos;re looking.</span>
              </h1>
            </div>
            <p>
              Real prices. Every country. Past the login. Watch it happen live.
            </p>
          </div> */}
        </section>
        <LiveSection onConnection={setConnected} />
        {!connected && (
          <section
            id="schematic"
            className="console-section"
            aria-label="Static schematic"
          >
            <div className="console-toolbar">
              <span>Browser operations</span>
              <span className="mode-label">
                Offline preview · live browsers appear when a run starts
              </span>
            </div>
            <div className="operations-grid">
              <aside
                className="telemetry"
                aria-label="Selected agent telemetry"
              >
                <div className="panel-caption">Selected agent</div>
                <h2>{job.name}</h2>
                <p className="job-goal">{job.goal}</p>
                <svg
                  className="routing-map"
                  viewBox="0 0 280 145"
                  role="img"
                  aria-label="Cloud browsers route to Canada, United States, and Germany proxies"
                >
                  <path
                    d="M35 72H106 M106 30V116 M106 30H212 M106 72H212 M106 116H212"
                    fill="none"
                    stroke="var(--structure)"
                  />
                  <circle cx="35" cy="72" r="6" fill="var(--text)" />
                  <text x="10" y="98">
                    CLOUD
                  </text>
                  {["CA", "US", "DE"].map((c, i) => (
                    <g key={c}>
                      <circle
                        cx="212"
                        cy={30 + i * 43}
                        r="5"
                        fill={
                          job.country === c
                            ? "var(--accent)"
                            : "var(--structure)"
                        }
                      />
                      <text
                        x="230"
                        y={34 + i * 43}
                        fill={
                          job.country === c ? "var(--accent)" : "var(--muted)"
                        }
                      >
                        {c}
                      </text>
                    </g>
                  ))}
                </svg>
                <dl className="telemetry-fields">
                  <div>
                    <dt>Proxy</dt>
                    <dd>{job.proxy}</dd>
                  </div>
                  <div>
                    <dt>Device</dt>
                    <dd>{job.device}</dd>
                  </div>
                  <div>
                    <dt>Access</dt>
                    <dd>{job.auth}</dd>
                  </div>
                  <div>
                    <dt>Session</dt>
                    <dd>{playerUrl ? "Player linked" : "Not connected"}</dd>
                  </div>
                </dl>
                <div className="panel-caption">Execution path</div>
                <ol className="compact-trace">
                  {job.steps.map((step, i) => (
                    <li key={step}>
                      <span className="mono">0{i + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </aside>
              <div className="browser-stage">
                <div className="agent-tabs" aria-label="Choose agent">
                  {config.jobs.map((j) => (
                    <button
                      key={j.id}
                      type="button"
                      aria-pressed={jobId === j.id}
                      onClick={() => selectJob(j.id)}
                    >
                      {j.name}
                      <span>
                        {j.country.length === 2
                          ? j.country
                          : j.id === "walker"
                            ? "AUTH"
                            : "DOM"}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="browser-chrome">
                  <span className="window-dots" aria-hidden="true">
                    ● ● ●
                  </span>
                  <span>{job.target}</span>
                  <span>
                    {recording
                      ? "Demo capture"
                      : playerUrl
                        ? "Live player"
                        : "Page state"}
                  </span>
                </div>
                <div className="browser-viewport">
                  {recording ? (
                    <div className="archive-view">
                      <img
                        src="/live-view.png"
                        alt="Periscope running eight browsers at once during a demo"
                      />
                      <p>Eight browsers during a demo run.</p>
                    </div>
                  ) : playerUrl ? (
                    <iframe
                      title={`${job.name} browser session`}
                      src={playerUrl}
                      allow="clipboard-read; clipboard-write"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="target-schematic">
                      <div className="target-brand">
                        HELIX LEDGER <span>demo target</span>
                      </div>
                      {job.id === "reveal" ? (
                        <>
                          <div className="schematic-label">
                            Pricing · recovered page state
                          </div>
                          <h3>
                            One toggle.
                            <br />A different price.
                          </h3>
                          <div className="billing-state">
                            <span>Monthly</span>
                            <strong>Annual</strong>
                          </div>
                          <div className="recovered-value">
                            CA$26<small>per user / month</small>
                          </div>
                          <p>Annual billing · reported example</p>
                        </>
                      ) : job.id === "walker" ? (
                        <>
                          <div className="schematic-label">
                            Dashboard · signed in
                          </div>
                          <h3>Team plan</h3>
                          <div className="seat-count">
                            25 <span>/ 30 seats</span>
                          </div>
                          <div
                            className="seat-grid"
                            aria-label="25 of 30 seats used"
                          >
                            {Array.from({ length: 30 }, (_, i) => (
                              <i key={i} className={i < 25 ? "used" : ""} />
                            ))}
                          </div>
                          <p>Seat usage recovered behind the login.</p>
                        </>
                      ) : (
                        <>
                          <div className="schematic-label">
                            Same page, seen from abroad
                          </div>
                          <div className="country-large">{job.country}</div>
                          <h3>Same page. Different vantage.</h3>
                          <p>
                            {job.proxy}
                            <br />
                            {job.device}
                          </p>
                          <div className="regional-empty">
                            Run the demo to see the price from here.
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="browser-status">
                  <div>
                    <span className="field-label">Objective</span>
                    <p>{job.goal}</p>
                  </div>
                  <button
                    type="button"
                    className="archive-button"
                    aria-pressed={recording}
                    onClick={() => setRecording(!recording)}
                  >
                    {recording
                      ? "Back to selected agent"
                      : "See a demo capture"}{" "}
                    ↗
                  </button>
                </div>
                <div className="agent-strip">
                  {config.jobs
                    .filter((j) => ["reveal", "ca", "walker"].includes(j.id))
                    .map((j) => (
                      <button
                        key={j.id}
                        type="button"
                        onClick={() => selectJob(j.id)}
                        aria-pressed={jobId === j.id}
                      >
                        <span>{j.name}</span>
                        <strong>{j.result}</strong>
                        <small>{j.detail}</small>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </section>
        )}
        <section
          id="results"
          className="console-section results-section"
          aria-labelledby="results-title"
        >
          <div className="console-section-title">
            <div>
              <div className="eyebrow">The benchmark · {benchmark.date}</div>
              <h2 id="results-title">
                65 planted facts.
                <br />
                How much made it through?
              </h2>
            </div>
            <div className="benchmark-score">
              63<span>/65</span>
              <small>facts Periscope brought back</small>
            </div>
          </div>
          <div className="results-grid">
            <div>
              <div className="metric-controls" aria-label="Benchmark metric">
                <button
                  type="button"
                  aria-pressed={metric === "material"}
                  onClick={() => setMetric("material")}
                >
                  Facts in material
                </button>
                <button
                  type="button"
                  aria-pressed={metric === "reported"}
                  onClick={() => setMetric("reported")}
                >
                  Reported by Opus 4.8
                </button>
              </div>
              <div className="console-chart">
                {benchmark.approaches.map((a, i) => {
                  const v = a[metric];
                  return (
                    <div
                      className={`chart-row ${i === 0 ? "highlight" : ""}`}
                      key={a.name}
                    >
                      <div className="chart-title">
                        <strong>{a.name}</strong>
                        <span>
                          {v ?? "N/A"}
                          {v !== null && <span className="muted"> / 65</span>}
                        </span>
                      </div>
                      <div className="bar-track">
                        <div style={{ width: `${((v ?? 0) / 65) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="benchmark-explanation">
              <span className="panel-caption">How to read this</span>
              <p>
                Periscope collected <strong>63</strong> facts. Opus reported{" "}
                <strong>58</strong> after reading that material.
              </p>
              <p>
                ChatGPT Astra scored <strong>38</strong> on its separately
                hand-scored browsing answer. It stopped at the login; it has no
                Opus follow-up score.
              </p>
              <p>
                The comparison ran on Helix Ledger, a controlled test site with
                65 planted facts. The same browser code runs in the demo above.
              </p>
              <a
                href="/benchmark/results-2026-09-13-14-16.md"
                className="text-link"
              >
                Read the original report ↗
              </a>
            </div>
          </div>
          <details className="method">
            <summary>
              Full group breakdown and scoring method <span>+</span>
            </summary>
            <div
              className="table-region"
              tabIndex={0}
              role="region"
              aria-label="Benchmark group results"
            >
              <table>
                <caption>
                  Cells show facts in material / reported by Opus 4.8. ChatGPT
                  is the separately scored answer.
                </caption>
                <thead>
                  <tr>
                    <th>Rubric group</th>
                    <th>Facts</th>
                    <th>Fetch</th>
                    <th>Parallel</th>
                    <th>Periscope</th>
                    <th>ChatGPT</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmark.groups.map((g) => (
                    <tr key={g.name}>
                      <td>{g.name}</td>
                      <td>{g.total}</td>
                      <td>{g.fetch.join(" / ")}</td>
                      <td>{g.reader.join(" / ")}</td>
                      <td>{g.periscope.join(" / ")}</td>
                      <td>{g.chatgpt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Matching uses case-insensitive substrings of planted text.
              Integration statuses require name and status. This is a controlled
              benchmark, not a general ranking.{" "}
              <a href="/benchmark/helix-rubric.json">Download rubric</a> ·{" "}
              <a href="/benchmark/manual-results.json">ChatGPT scoring</a>
            </p>
          </details>
        </section>
      </main>
      <footer className="console-footer">
        <span>
          Periscope · browser agents that read what the web hides · powered by
          Steel cloud browsers
        </span>
        <a href="https://github.com/FahadNafeesAhmed/periscope">
          Code, evidence, and the experiment ↗
        </a>
      </footer>
    </div>
  );
}

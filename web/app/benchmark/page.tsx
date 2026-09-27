"use client";
import { useState } from "react";
import { Mark } from "@/components/sections";
import { useTheme } from "@/components/theme-provider";
import benchmark from "@/public/benchmark/summary.json";

export default function BenchmarkPage() {
  const { theme, toggle: toggleTheme } = useTheme();
  const [metric, setMetric] = useState<"material" | "reported">("material");
  return (
    <div className="hackathon">
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="console-header">
        <a className="wordmark" href="/">
          <Mark />
          periscope.
        </a>
        <nav aria-label="Main navigation">
          <a href="/">Back to app</a>
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
                <button type="button" aria-pressed={metric === "material"} onClick={() => setMetric("material")}>
                  Facts in material
                </button>
                <button type="button" aria-pressed={metric === "reported"} onClick={() => setMetric("reported")}>
                  Reported by Opus 4.8
                </button>
              </div>
              <div className="console-chart">
                {benchmark.approaches.map((a, i) => {
                  const v = a[metric];
                  return (
                    <div className={`chart-row ${i === 0 ? "highlight" : ""}`} key={a.name}>
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
              <a href="/benchmark/results-2026-09-13-14-16.md" className="text-link">
                Read the original report ↗
              </a>
            </div>
          </div>
          <details className="method">
            <summary>
              Full group breakdown and scoring method <span>+</span>
            </summary>
            <div className="table-region" tabIndex={0} role="region" aria-label="Benchmark group results">
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

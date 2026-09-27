"use client";
import { useState } from "react";
import { Mark } from "./mark";
import { LiveSection } from "./live-section";
import { useTheme } from "./theme-provider";

const githubLink = "https://github.com/FahadNafeesAhmed/periscope"

export function Landing() {
  const { theme, toggle: toggleTheme } = useTheme();
  const [connected, setConnected] = useState(false);
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
          <a href="/benchmark">Benchmark</a>
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
          {/* intro placeholder */}
        </section>
        <LiveSection onConnection={setConnected} />
        {!connected && (
          <section
            id="schematic"
            className="console-section gap-section"
            aria-label="What Periscope finds"
          >
            <div className="console-section-title">
              <div>
                <div className="eyebrow">The gap</div>
                <h2 id="gap-title">What a scraper sees<br /><span className="muted">vs. what&apos;s actually there.</span></h2>
              </div>
              <p>Competitor pages hide pricing behind toggles, country redirects, and logins. Periscope opens real browsers that click, navigate, and sign in. Then reports what it finds with evidence.</p>
            </div>
            <div className="gap-grid">
              <div className="gap-col gap-before">
                <div className="gap-label">What a scraper or ChatGPT sees</div>
                <div className="gap-card">
                  <div className="gap-card-head">Pricing page HTML</div>
                  <div className="gap-item">&ldquo;Starting at $39/user/month&rdquo;</div>
                  <div className="gap-item dim">Annual toggle? Not clicked.</div>
                  <div className="gap-item dim">Volume pricing? Behind a dropdown.</div>
                  <div className="gap-item dim">Other countries? Same US page.</div>
                  <div className="gap-item dim">Dashboard? Behind a login wall.</div>
                  <div className="gap-score"><span>22</span> / 65 facts recovered</div>
                </div>
              </div>
              <div className="gap-col gap-after">
                <div className="gap-label">What Periscope finds</div>
                <div className="gap-card highlight">
                  <div className="gap-card-head">5 browsers, 3 countries, 1 sign-in</div>
                  <div className="gap-item">CA$26/user/month <small>annual billing toggled</small></div>
                  <div className="gap-item">From $39/user/month <small>100+ seat dropdown</small></div>
                  <div className="gap-item">25 of 30 seats used <small>signed-in dashboard</small></div>
                  <div className="gap-item">$29/mo in US, {"\u20AC"}31/mo in DE <small>country proxies</small></div>
                  <div className="gap-item">Team plan, Pro plan <small>feature matrix extracted</small></div>
                  <div className="gap-score accent"><span>63</span> / 65 facts recovered</div>
                </div>
              </div>
            </div>
          </section>
        )}
        <div className="benchmark-link-bar">
          Periscope recovered 63 of 65 planted facts in a controlled benchmark. <a href="/benchmark" className="text-link">See how it compares ↗</a>
        </div>
      </main>
      <footer className="console-footer">
        <span>
          Periscope · browser agents that read what the web hides · powered by
          Steel cloud browsers
        </span>
        <a href={githubLink}>
          Code, evidence, and the experiment ↗
        </a>
      </footer>
    </div>
  );
}

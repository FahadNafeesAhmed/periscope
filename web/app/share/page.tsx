"use client";
import { Mark } from "@/components/sections";
import { useTheme } from "@/components/theme-provider";

const ASSETS = [
  { file: "/shareable_assets/shareable-asset1.svg", label: "Asset 1" },
  { file: "/shareable_assets/shareable-asset2.svg", label: "Asset 2" },
  { file: "/shareable_assets/shareable-asset3.svg", label: "Asset 3" },
  { file: "/shareable_assets/shareable-asset4.svg", label: "Asset 4" },
  { file: "/shareable_assets/shareable-asset5.svg", label: "Asset 5" },
];

export default function SharePage() {
  const { theme, toggle: toggleTheme } = useTheme();

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
        <section className="console-section share-section" aria-labelledby="share-title">
          <div className="console-section-title">
            <div>
              <div className="eyebrow">Share Periscope</div>
              <h2 id="share-title">Shareable assets.</h2>
            </div>
            <p>Download and share these assets to help others discover what the web hides.</p>
          </div>

          <div className="share-grid">
            {ASSETS.map((asset) => (
              <a
                key={asset.file}
                href={asset.file}
                target="_blank"
                rel="noreferrer"
                className="share-card"
              >
                <img src={asset.file} alt={asset.label} />
                <span className="share-card-label">{asset.label}</span>
              </a>
            ))}
          </div>

          <div className="share-credits">
            <span className="panel-caption">Photo credits</span>
            <p>Images by <a href="https://unsplash.com/@adamthomas48" target="_blank" rel="noreferrer" className="text-link">Adam Thomas</a> and <a href="https://unsplash.com/@dunkeltaenzer" target="_blank" rel="noreferrer" className="text-link">Dunkeltaenzer</a> on Unsplash.</p>
          </div>
        </section>
      </main>
      <footer className="console-footer">
        <span>Periscope · browser agents that read what the web hides · powered by Steel cloud browsers</span>
        <a href="https://github.com/FahadNafeesAhmed/periscope">Code, evidence, and the experiment ↗</a>
      </footer>
    </div>
  );
}

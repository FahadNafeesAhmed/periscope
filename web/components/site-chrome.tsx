"use client";
import { Mark } from "./mark";
import { ExternalLink, Moon, Sun } from "./icons";
import { useTheme } from "./theme-provider";

export const GITHUB_URL = "https://github.com/FahadNafeesAhmed/periscope";

export type AgentStatus = "ready" | "busy" | "offline" | "unknown";
const STATUS_TEXT: Record<AgentStatus, string> = { ready: "Agents ready", busy: "Agents working", offline: "Agents offline", unknown: "Connecting" };

export function SiteHeader({ status, home = true }: { status?: AgentStatus; home?: boolean }) {
  const { theme, toggle } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a className="wordmark" href="/" aria-label="Periscope home"><Mark />Periscope</a>
        <nav aria-label="Main">
          <a href={home ? "#brief" : "/#brief"}>Brief</a>
          <a href={home ? "#how" : "/#how"}>How it works</a>
          <a href="/benchmark/">Benchmark</a>
          <a href={GITHUB_URL}>GitHub <ExternalLink size={12} /></a>
        </nav>
        <div className="header-end">
          {status && <span className={`agent-status ${status}`} role="status"><i aria-hidden="true" />{STATUS_TEXT[status]}</span>}
          <button type="button" className="icon-button" onClick={toggle} aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`}>
            {theme === "dark" ? <Sun /> : <Moon />}
          </button>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <span>Periscope runs real browsers on Steel. Built at the UTMIST × WAT.ai Battle of the Schools hackathon.</span>
        <a href={GITHUB_URL}>Source, evidence and the experiment <ExternalLink size={12} /></a>
      </div>
    </footer>
  );
}

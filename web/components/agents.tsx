"use client";
// Beside the brief: what the agents are doing right now. A wall that needs a person comes first, then one line of
// progress per run, then a single live browser (streaming players are heavy), then the raw log for the curious.
import { useEffect, useRef, useState } from "react";
import { apiGet, countryName, usePoll, type Handoff, type LiveSession, type RunView, type StoredEvent } from "@/lib/api";
import { pathOf } from "@/lib/brief";
import { newTraceState, storyFor, storyOrder, updateTrace, type Story, type TraceState } from "@/lib/story";
import type { RunController } from "@/lib/run-controller";
import { ExternalLink, Square } from "./icons";

export function AgentRail({ rc }: { rc: RunController }) {
  const { sessions, handoffs, followedRuns, connected } = rc;

  const traceRef = useRef<TraceState>(newTraceState());
  const [, setTraceVersion] = useState(0);
  useEffect(() => {
    updateTrace(traceRef.current, sessions, handoffs);
    setTraceVersion((v) => v + 1);
  }, [sessions, handoffs]);
  const { trace } = traceRef.current;
  const working = (rc.runs ?? []).some((r) => followedRuns.includes(r.id) && (r.status === "running" || r.status === "queued"));

  if (!connected) {
    return (
      <aside className="rail" aria-label="Agents">
        <h3 className="rail-title">Agents</h3>
        <p className="rail-empty">The agents are offline right now, so you&apos;re reading a sample. When they&apos;re online, every browser shows up here as it works: which page, which country, and anything that needs a person.</p>
      </aside>
    );
  }

  return (
    <aside className="rail" aria-label="Agents">
      <div className="rail-head">
        <h3 className="rail-title">Agents</h3>
        {working && <button type="button" className="button ghost small" onClick={rc.stop}><Square size={12} />Stop</button>}
      </div>

      {handoffs.map((h) => <WallCard key={`${h.jobId}:${h.generation}`} h={h} onResume={() => rc.resume(h)} />)}

      <ol className="stories">
        {followedRuns.length === 0 && <li className="rail-empty">Start a brief to follow the agents here.</li>}
        {[...followedRuns].sort((a, b) => storyOrder(a) - storyOrder(b)).map((id) => <StoryItem key={id} runId={id} />)}
      </ol>

      <Browsers sessions={sessions} />

      <details className="log">
        <summary>Browser log{trace.length ? ` · ${trace.length}` : ""}</summary>
        <ol>
          {trace.length === 0 && <li className="muted">Waiting for the first browser.</li>}
          {[...trace].reverse().slice(0, 40).map((t, i) => <li key={i} className={t.kind}><time>{t.at}</time>{t.text}</li>)}
        </ol>
      </details>
    </aside>
  );
}

function WallCard({ h, onResume }: { h: Handoff; onResume: () => void }) {
  return (
    <div className="wall" role="alert">
      <strong>A {h.wall.toLowerCase()} needs a person</strong>
      <p>The browser is paused, not closed. Clear it in the live view, then let the agent continue.</p>
      <div className="wall-actions">
        <a className="button secondary small" href={h.viewerUrl} target="_blank" rel="noreferrer">Open live view <ExternalLink size={12} /></a>
        <button type="button" className="button primary small" onClick={onResume}>I cleared it, resume</button>
      </div>
    </div>
  );
}

const KIND_LABEL: Record<Story["kind"], string> = { PARSE: "Reading pages", COUNTRIES: "Other countries", "LOG IN": "Signing in" };

function StoryItem({ runId }: { runId: string }) {
  const story = usePoll<Story>(async () => {
    const [run, ev] = await Promise.all([apiGet<RunView>(`/runs/${runId}`), apiGet<{ events: StoredEvent[] }>(`/runs/${runId}/events?format=json`)]);
    return run?.ok ? storyFor(run, ev?.events ?? []) : null;
  }, 3000, [runId]);
  if (!story) return null;
  const state = story.status === "running" || story.status === "queued" ? "running" : story.status === "completed" ? "done" : "stopped";
  const line = story.lines[0];
  return (
    <li className={`story ${state}`}>
      <i className="story-dot" aria-hidden="true" />
      <div>
        <div className="story-head"><strong>{KIND_LABEL[story.kind]}</strong><span>{state === "running" ? "working" : state === "done" ? (story.seconds !== null ? `${story.seconds} s` : "done") : story.status}</span></div>
        {line && <p className={line.tone} dangerouslySetInnerHTML={{ __html: line.html }} />}
        {story.lines.length > 1 && (
          <details className="story-more">
            <summary>{story.lines.length - 1} more</summary>
            {story.lines.slice(1).map((l, i) => <p key={i} className={l.tone} dangerouslySetInnerHTML={{ __html: l.html }} />)}
          </details>
        )}
      </div>
    </li>
  );
}

function Browsers({ sessions }: { sessions: LiveSession[] }) {
  const [focus, setFocus] = useState<string | null>(null);
  if (!sessions.length) return null;
  const s = sessions.find((x) => x.sessionId === focus) ?? sessions.find((x) => x.pendingWall) ?? sessions[0];
  const label = (x: LiveSession) => {
    const where = x.vantage.country ? countryName(x.vantage.country) : null;
    const what = x.purpose === "walker" ? (x.accountRef ? "Signed in" : "Signing in") : x.purpose === "borders" ? null : "Reading";
    return [what, where].filter(Boolean).join(" from ") || "Browser";
  };
  return (
    <section className="browsers" aria-label="Live browsers">
      <div className="browsers-head"><span>Live browsers</span><span className="muted">{sessions.length} open</span></div>
      <figure className="player">
        <iframe title={`Live browser ${label(s)}`} src={s.playerUrl} allow="clipboard-read; clipboard-write" referrerPolicy="no-referrer" />
        <figcaption>
          <span className="player-url">{s.currentUrl ? pathOf(s.currentUrl) : "…"}</span>
          <a href={s.viewerUrl} target="_blank" rel="noreferrer">Full view <ExternalLink size={12} /></a>
        </figcaption>
      </figure>
      {sessions.length > 1 && (
        <ul className="browser-list">
          {sessions.map((x) => (
            <li key={x.sessionId}>
              <button type="button" aria-pressed={x.sessionId === s.sessionId} onClick={() => setFocus(x.sessionId)}>
                <span>{label(x)}</span>
                {x.pendingWall ? <span className="warn">needs a person</span> : <span className="muted">{x.currentUrl ? pathOf(x.currentUrl) : ""}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

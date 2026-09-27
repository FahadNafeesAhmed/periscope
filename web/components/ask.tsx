"use client";
// Ask the brief a question. The API answers only from what the browsers observed, and every claim must cite
// observation ids, so each answer shows the lines it rests on.
import { useState } from "react";
import { apiPost, countryName, type Observation, type ResearchAnswer } from "@/lib/api";
import { pathOf, revealPhrase } from "@/lib/brief";
import { ArrowRight } from "./icons";

const SUGGESTIONS = ["Which features are Enterprise-only?", "Is there a discount for paying annually?", "What security reports do they publish?"];

type Answer = { question: string; claims: Array<{ text: string; evidence: Observation[] }>; matches: Observation[]; note?: string };

export function Ask({ runIds, name }: { runIds: string[]; name: string }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [error, setError] = useState("");

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true); setError(""); setQ(text);
    const results = await Promise.all(runIds.map((id) => apiPost<ResearchAnswer & { ok: boolean; reason?: string }>(`/runs/${id}/research`, { query: text })));
    const ok = results.map((r) => r.body).filter((b): b is ResearchAnswer & { ok: boolean } => Boolean(b?.ok));
    if (!ok.length) { setError(results.find((r) => r.body?.reason)?.body?.reason ?? "Couldn't get an answer right now."); setBusy(false); return; }
    const byId = new Map(ok.flatMap((b) => b.observations).map((o) => [o.id, o]));
    // Several runs can support the same claim; show it once with all of its evidence.
    const merged = new Map<string, { text: string; ids: Set<string> }>();
    for (const c of ok.flatMap((b) => b.claims)) {
      const k = c.text.trim().toLowerCase();
      const m = merged.get(k) ?? { text: c.text, ids: new Set<string>() };
      c.evidenceIds.forEach((id) => m.ids.add(id));
      merged.set(k, m);
    }
    const claims = [...merged.values()].map((c) => ({ text: c.text, evidence: [...c.ids].map((id) => byId.get(id)).filter((o): o is Observation => Boolean(o)) }));
    setAnswers((a) => [{ question: text, claims, matches: claims.length ? [] : [...byId.values()].slice(0, 6), note: ok.find((b) => b.note)?.note }, ...a]);
    setQ(""); setBusy(false);
  }

  return (
    <section className="brief-section" aria-labelledby="ask-title">
      <div className="section-bar"><h3 id="ask-title">Ask about {name}</h3><span className="section-note">Answered only from what the browsers saw</span></div>
      <form className="ask" onSubmit={(e) => { e.preventDefault(); void ask(q); }}>
        <label htmlFor="ask-input" className="visually-hidden">Question</label>
        <input id="ask-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Is SSO included on every plan?" maxLength={500} />
        <button type="submit" className="button primary small" disabled={!q.trim() || busy}>{busy ? "Reading…" : "Ask"}{!busy && <ArrowRight size={14} />}</button>
      </form>
      {!answers.length && (
        <div className="suggestions">
          {SUGGESTIONS.map((s) => <button key={s} type="button" onClick={() => void ask(s)} disabled={busy}>{s}</button>)}
        </div>
      )}
      {error && <p className="ask-error" role="alert">{error}</p>}
      <div aria-live="polite">
        {answers.map((a, i) => (
          <div key={i} className="answer">
            <p className="answer-q">{a.question}</p>
            {a.claims.length > 0 ? (
              <ol className="claims">
                {a.claims.map((c, j) => (
                  <li key={j}>
                    <p>{c.text}</p>
                    <ul className="citations">{c.evidence.map((o) => <li key={o.id}><q>{o.text}</q><span>{where(o)}</span></li>)}</ul>
                  </li>
                ))}
              </ol>
            ) : a.matches.length > 0 ? (
              <>
                <p className="answer-note">No written answer{a.note ? ` (${a.note.replace(/\.$/, "")})` : ""}. These are the lines that match:</p>
                <ul className="citations">{a.matches.map((o) => <li key={o.id}><q>{o.text}</q><span>{where(o)}</span></li>)}</ul>
              </>
            ) : (
              <p className="answer-note">Nothing the browsers saw answers this. It may be on a page they didn&apos;t open; try the whole site.</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

const where = (o: Observation) => [pathOf(o.url), o.vantage.country ? countryName(o.vantage.country) : null, o.vantage.authenticated ? "signed in" : null, o.revealedBy?.label ? revealPhrase(o) : null].filter(Boolean).join(" · ");

# Periscope · The Brief (design variant B)

A static Next.js console that turns Periscope's browser runs into a competitive brief: the document a founder, advisor or investor takes into a pricing review, a board meeting or an IC memo. This is variant B of an A/B test against the v1 console on `main`; both run the same jobs through the same API.

The page has three parts. The **hero** states the promise, takes a competitor's address (bare domains are fine), offers whole-site and country switches, shows the run plan, and uses the benchmark as proof. The **brief** leads with key findings in plain sentences, each with its source, then pricing by country, changes since the last run, facts behind clicks and behind the login, features and plans, evidence-backed answers (Ask), and how it was gathered; it copies as Markdown and exports prices as CSV. The **agent rail** beside it puts walls that need a person first, then one progress line per run, one live Steel browser at a time, a Stop button, and the raw browser log.

## Run locally

```bash
cd web && npm ci && npm run dev
```

Open http://localhost:3000. Node.js 20.9 or newer is required. Start the API from the repository root with `STEEL_API_KEY=... npm run api` (port 4747); the console connects to that address by default. Without the API the page shows a sample brief (labelled as one) built from the team's reported Helix Ledger figures.

Environment (all optional, read at build time):

| Variable | Default | Meaning |
| --- | --- | --- |
| `NEXT_PUBLIC_PERISCOPE_API_URL` | `http://localhost:4747` | Where the Periscope API answers |
| `NEXT_PUBLIC_PERISCOPE_TARGET_URL` | `https://testsaasstartup.vercel.app` | Helix Ledger, the target of the one-button demo |
| `NEXT_PUBLIC_PERISCOPE_TARGET_EMAIL` | `test@test.com` | The account shown next to the login beat (the password lives only in Steel's vault) |

The Helix button posts three runs to `POST /runs`: parse (surface, benchmark, reveal on pricing, regulatory and security), three countries (borders from CA, US and DE, six browsers) and log in (walker with `accountRef: "trial1"`, so Steel injects the vaulted credential). Store that credential once with `npm run setup-credential -- --competitor helix-ledger --origin https://testsaasstartup.vercel.app --username test@test.com --account trial1` from the repository root.

## Deploy on Vercel

The site is a static export (`output: "export"`), so it needs no server. The `vercel.json` at the repository root installs and builds this folder and serves `out/`; import the repository at vercel.com/new and press Deploy. Set `NEXT_PUBLIC_PERISCOPE_API_URL` in the project when the API is somewhere other than the viewer's own machine (for example a Cloudflare tunnel in front of port 4747). Alternatively set the project's Root Directory to `web` and let Vercel's Next.js preset build it.

## Production checks

```cmd
npm run build
npm run typecheck
```

The production build produces `out/` using Next.js static export: https://nextjs.org/docs/app/guides/static-exports. There are no runtime server routes. Do not use `next start` for this export.

## Files

```text
app/
  globals.css            Tokens (light and dark), layout, components, responsive rules
  layout.tsx             Fonts (Geist), metadata, theme set before first paint
  page.tsx               The console
  benchmark/page.tsx     The benchmark, banded by where each planted fact lives
components/
  console.tsx            Hero, workspace, "Why not just ask ChatGPT?", how it works
  brief.tsx              The brief document
  ask.tsx                Questions answered from observations (POST /runs/:id/research)
  agents.tsx             Walls, run progress, live browser, log
  site-chrome.tsx        Header with agent status, footer
  icons.tsx, mark.tsx    Lucide icons used on actions; the Periscope mark
  theme-provider.tsx     Light and dark themes
lib/
  api.ts                 API client, types, polling
  run-controller.ts      Launching, following, resuming and stopping runs
  brief.ts               Brief data, findings, Markdown and CSV export, run diff
  story.ts               Plain-language run stories and the browser log
  sample.ts              The offline sample brief and benchmark figures
```

## Honesty rules

Every finding is derived from API data and names where it was seen. The sample brief uses only the team's reported Helix Ledger figures and is labelled as a sample. Comparisons with other tools say what the benchmark supports: ChatGPT with browsing did slightly better than Periscope behind clicks (15 against 13); Periscope's lead is behind the login (28 of 28 against 1).

## Visual direction

Neutral ink on white (and near-black in dark mode), Geist for everything, with mono only for addresses and paths. Hierarchy comes from size, weight and grey levels rather than boxes: the brief is the only card. There is one accent with one meaning: a highlighter marks a fact that a plain fetch missed, and it is used only in the key findings and the comparison so it keeps that meaning. Amber and green mark state only (a wall that needs a person, an agent working, a line added). No gradients, glass, glows or entrance animations; motion is limited to 150 ms state transitions and a pulse on things that are live, and it is disabled under reduced motion.

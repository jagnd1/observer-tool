# Observer Tool

> An independent observer for any problem-solution pair — not a validator, an interrogator.

Give it a problem you're trying to solve and the solution you're considering. It fires **4 adversarial lenses in parallel**, each with no awareness of the others, and surfaces what you might be missing — from above (systemic), below (mechanical), and sideways (lateral).

Then it enters a **convergence loop**: you review each observation, correct what's wrong, and let the system refine until the analysis reaches your version of the truth.

Built on Claude (Anthropic) · React + Vite · local dev only

---

## Screenshots

> Add your own screenshots to `docs/screenshots/` and uncomment these lines.

<!-- ![Initial analysis — 4-direction graph](docs/screenshots/01-initial-analysis.png) -->
<!-- ![Feedback mode — ✓ accept or ↺ correct each node](docs/screenshots/02-feedback-mode.png) -->
<!-- ![Convergence bar — partial progress across lenses](docs/screenshots/03-convergence-bar.png) -->
<!-- ![All lenses converged — near-optimal solution reached](docs/screenshots/04-converged.png) -->

---

## Why this exists

Most thinking tools help you go deeper into the path you're already on. Observer does the opposite — it stress-tests your framing before you commit.

The lenses are intentionally adversarial:
- One is trying to prove your problem statement is wrong
- One is checking whether your solution actually solves it
- One is looking for what you haven't thought about at all
- One is generating fundamentally different approaches

They run in parallel with isolated prompts so none of them can anchor to or reinforce the others.

---

## The 4 lenses

| Lens | Mode | What it interrogates |
|------|------|----------------------|
| **Problem clarity** | First principles | Root cause vs symptom, baked-in assumptions, scope mismatch, what is NOT being said |
| **Solution fit** | Logic chain | Whether the solution closes the loop — reasoning gaps, weakest assumption, new problems introduced |
| **Blind spots** | Observer mode | Adversarial view — second-order effects, failure modes nobody is talking about, what a skeptic attacks first |
| **Alternatives** | Lateral thinking | Fundamentally different approaches — cross-domain solutions, contrarian takes, constraint removal, inversion |

---

## The 4-direction graph

Each lens renders as an interactive cross-shaped tree:

```
              ↑n  most abstract / systemic WHY
              ↑2
              ↑1  one level above core
    ↔2 ━━━━━━ CORE ━━━━━━ ↔1   lateral views (analogies, alt frames)
              ↓1  one level below core
              ↓2
              ↓m  most granular / atomic HOW
```

The graph starts collapsed at **CORE**. Click it to expand level 1 in all directions. Click the outermost ↑ or ↓ node to reveal the next level outward. Lateral nodes appear left and right.

You control depth with three sliders: `n` (abstract levels up), `m` (detail levels down), `p` (lateral views).

---

## The convergence loop

After the initial analysis, each node becomes interactive:

1. **Hover a node** — two small buttons appear: `✓` accept · `↺` correct
2. **Accept** — you agree with the observation; it dims slightly and is locked in
3. **Correct** — you disagree; type your correction and press Enter. The node shows your note.
4. **Review all nodes** — once every visible node has feedback, a **Refine → Round N** button appears at the bottom of the card
5. **Refine** — the lens re-runs with your feedback injected into the prompt. Accepted nodes are preserved; corrected ones are substantially rewritten. The graph stays expanded.
6. **Repeat** until all nodes are accepted → click **Mark converged ✓**

A **convergence bar** across all 4 lenses shows overall progress. When all 4 lenses converge, the bar fills and shows: *Near-optimal solution reached*.

The loop terminates when you stop disagreeing — when the analysis has been steered close enough to your understanding of the problem that nothing needs correcting.

---

## Depth controls

| Param | Axis | Meaning |
|-------|------|---------|
| `n` | vertical ↑ | Abstract levels above core (why / systemic) |
| `m` | vertical ↓ | Detail levels below core (how / mechanical) |
| `p` | horizontal ↔ | Lateral views at core level (analogies / alt frames) |

**Good starting point:** `n=2, m=2, p=2`

Push `m` higher to dig into root causes. Push `n` higher if you suspect you're solving the wrong level of problem entirely. More lateral views (`p`) gives wider analogical coverage.

---

## Example

**Problem:** Users aren't adopting our new feature after launch.

**Proposed solution:** Add an onboarding tooltip walkthrough.

```
Problem clarity  [First principles]
  ↑2  Adoption is a signal of product-market fit, not a UX problem
  ↑1  Feature may be solving a problem users don't have yet
 CORE  Users don't understand the feature's value proposition
  ↓1  They encounter it but don't see relevance to their workflow
  ↓2  Discovery path puts the feature in front of wrong user segment
  ↔  [SaaS activation research]  [Crossing the Chasm adoption curve]

Solution fit  [Logic chain]
  ↑2  Tooltips address awareness but not motivation or perceived value
  ↑1  Walkthrough assumes friction is informational, not attitudinal
 CORE  Tooltip solves discoverability, not value-gap
  ↓1  Users will click through without internalizing purpose
  ↓2  Completion rate masks whether behavior actually changed
  ...
```

After the first pass, you might correct the `↑2` of Problem clarity: *"actually it's a workflow mismatch, not fit."* On refine, the entire problem clarity chain updates around your correction — and the other lenses adapt in subsequent rounds.

---

## Setup

**Prerequisites:** Node.js 18+ · Anthropic API key ([get one here](https://console.anthropic.com/))

```bash
# 1. Install dependencies
npm install

# 2. Add your API key
cp .env.example .env
# Open .env and set VITE_ANTHROPIC_API_KEY=sk-ant-...

# 3. Start
npm run dev
```

Open **http://localhost:5173**

---

## Share on your local network

```bash
npm run dev -- --host
```

Vite prints a LAN address like `http://192.168.x.x:5173` — share with anyone on the same network.

---

## How the API key proxy works

The Vite dev server intercepts all `/api/anthropic/*` requests and forwards them to `https://api.anthropic.com`, injecting your key server-side. **Your key never touches the browser.** Safe for local dev and LAN sharing.

---

## Project structure

```
observer-tool/
  src/
    App.jsx            — root layout, iteration state, convergence loop
    QuadrantCard.jsx   — 4-direction graph, node feedback, refine footer
    DepthControls.jsx  — n/m/p depth pickers with live preview
    quadrants.js       — lens definitions, prompt builder, refinement content builder
    api.js             — Anthropic client (routes through Vite proxy)
    index.css          — base styles and CSS variables (light + dark)
  docs/screenshots/    — add screenshots here and uncomment README img tags
  vite.config.js       — dev server + API proxy config
  .env.example         — API key template
```

---

## Production warning

> **Do not expose `VITE_ANTHROPIC_API_KEY` in a public production build.**
> For production you need a real backend proxy (Express, FastAPI, etc.) that holds the key server-side. The current Vite proxy only works in dev mode.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) · Security issues: [SECURITY.md](SECURITY.md)

---

## License

MIT

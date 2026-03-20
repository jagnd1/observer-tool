# Observer Tool

> An independent observer for any problem-solution pair — not a validator, an interrogator.

Give it a problem you're trying to solve and the solution you're considering. It fires **4 adversarial lenses in parallel**, each with no awareness of the others, and surfaces what you might be missing from above (systemic), below (mechanical), and sideways (lateral).

Built on Claude (Anthropic) · React + Vite · local dev only

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

## Depth controls

Each lens produces a structured tree. You control how deep it goes with three parameters:

```
  ↑n   most abstract / meta / universal WHY
  ↑2   one more systemic level up
  ↑1   one WHY level above core
━━━━━  CORE — sharpest direct insight at surface level
  ↓1   one HOW level below core
  ↓2   one more mechanical level down
  ↓m   most granular / atomic root

  ↔1  ↔2  ↔p   lateral views — analogies, adjacent domains, alt framings
```

| Param | Axis | Meaning |
|-------|------|---------|
| `n` | vertical ↑ | Abstract levels above core (why / systemic) |
| `m` | vertical ↓ | Detail levels below core (how / mechanical) |
| `p` | horizontal ↔ | Lateral views at core level (analogies / alt frames) |

**Good starting point:** `n=2, m=2, p=2`

Push `m` higher to dig into root causes. Push `n` higher if you suspect you're solving the wrong level of problem entirely.

---

## Example

**Problem:** Users aren't adopting our new feature after launch.

**Proposed solution:** Add an onboarding tooltip walkthrough.

The tool would return (at n=2, m=2, p=2 across all 4 lenses):

```
Problem clarity  [First principles]
  ↑2  Adoption is a signal of product-market fit, not a UX problem
  ↑1  Feature may be solving a problem users don't have yet
  ━━  Users don't understand the feature's value proposition
  ↓1  They encounter it but don't see relevance to their workflow
  ↓2  Discovery path puts the feature in front of wrong user segment
  ↔  [SaaS activation research]  [Crossing the Chasm adoption curve]

Solution fit  [Logic chain]
  ↑2  Tooltips address awareness but not motivation or perceived value
  ↑1  Walkthrough assumes friction is informational, not attitudinal
  ━━  Tooltip solves discoverability, not value-gap
  ↓1  Users will click through without internalizing purpose
  ↓2  Completion rate masks whether behavior actually changed
  ...
```

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

Vite prints a LAN address like `http://192.168.x.x:5173` — share with anyone on the same network for testing without deployment.

---

## How the API key proxy works

The Vite dev server intercepts all `/api/anthropic/*` requests and forwards them to `https://api.anthropic.com`, injecting your key server-side. **Your key never touches the browser.** Safe for local dev and LAN sharing.

---

## Project structure

```
observer-tool/
  src/
    App.jsx            — root layout, orchestrates parallel analysis
    QuadrantCard.jsx   — renders a single lens as a depth tree
    DepthControls.jsx  — n/m/p pickers with live tree preview
    quadrants.js       — lens definitions and prompt builder
    api.js             — Anthropic client (routes through Vite proxy)
    index.css          — base styles and CSS variables (light + dark)
  vite.config.js       — dev server + API proxy config
  .env.example         — API key template
```

---

## Production warning

```bash
npm run build
```

> **Do not expose `VITE_ANTHROPIC_API_KEY` in a public production build.**
> For production you need a real backend proxy (Express, FastAPI, etc.) that holds the key server-side. The current Vite proxy only works in dev mode.

---

## License

MIT

# Contributing to Observer Tool

Thanks for your interest. This is a small, focused tool — contributions should stay true to that.

---

## What belongs here

- Bug fixes
- Improvements to the graph visualization or interaction model
- Better prompt engineering for the 4 lenses
- Accessibility and keyboard navigation improvements
- Documentation clarifications

## What does not belong here

- New lenses beyond the current 4 (the structure is intentionally fixed)
- Backend/server additions — this is a local-dev tool by design
- UI framework migrations or dependency bloat
- Features that require storing or transmitting user data

---

## Getting started

```bash
git clone https://github.com/jagnd1/observer-tool
cd observer-tool
npm install
cp .env.example .env   # add your Anthropic API key
npm run dev
```

---

## Pull request guidelines

1. **Keep PRs small and focused.** One thing per PR.
2. **No new dependencies** without discussion in an issue first.
3. **No API key handling changes** without a clear security rationale (see [SECURITY.md](SECURITY.md)).
4. **Describe what you changed and why** in the PR description — not just what.
5. Test manually before opening a PR (`npm run dev`, verify the graph renders and interaction works).

---

## Code style

- Inline styles only (no CSS modules or Tailwind) — consistent with the existing codebase
- No TypeScript — plain JSX
- No PropTypes additions required (linter warnings are informational, not blocking)
- Keep components small. If a function grows past ~80 lines, consider extracting.

---

## Opening issues

Use issues for:
- Bug reports (include browser, OS, and steps to reproduce)
- Feature proposals (describe the problem you're solving, not just the solution)
- Questions about the prompt design or lens logic

---

## Code of conduct

Be direct, be constructive, and keep the scope tight. This project has no tolerance for harassment or bad-faith contributions.

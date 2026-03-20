# Security Policy

## Scope

Observer Tool is a **local development tool**. It runs on your machine, proxies requests to the Anthropic API through Vite's dev server, and never stores or transmits your input beyond that API call.

The main security surface is the API key handling.

---

## API key safety

- Your `VITE_ANTHROPIC_API_KEY` is read by the Vite dev server at startup and injected server-side into proxied requests.
- **The key is never sent to the browser.** It does not appear in any network response, bundled JS, or localStorage.
- The `.env` file is in `.gitignore` — do not commit it.
- Do not run `npm run build` and deploy the output publicly. The production build does not include a proxy — a real backend is required for production deployment.

---

## Reporting a vulnerability

If you find a security issue (e.g. a way the API key could be leaked, an XSS vector, or a dependency with a known CVE), please **do not open a public issue**.

Report privately by emailing the repository owner or opening a [GitHub private security advisory](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability).

Include:
- A clear description of the vulnerability
- Steps to reproduce
- Your assessment of impact

You will receive a response within 5 business days.

---

## Dependencies

This project has a small, intentional dependency footprint:

| Package | Purpose |
|---------|---------|
| `react`, `react-dom` | UI rendering |
| `vite` | Dev server + API proxy |

Keep dependencies minimal. PRs that add new dependencies will be reviewed for supply chain risk before merging.

---

## Out of scope

- Issues in the Anthropic API itself — report those to Anthropic
- Vulnerabilities that require physical access to the machine running the dev server
- LAN sharing security (the `--host` flag is an opt-in dev convenience, not a production feature)

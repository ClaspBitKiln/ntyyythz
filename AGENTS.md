# Magic Metal website agent guide

## Goal
Maintain a fast, reliable Russian-language company website that works as a business card and lead-entry point for the future SaaS sales funnel.

## Non-negotiable facts
- Company: ООО «Мэджик Металл».
- Public office: 454004, г. Челябинск, ул. Гостевая, 3, офис 306.
- There is no representative office in Saint Petersburg. Do not add Санкт-Петербург or СПб to pages, metadata, schema, or SEO text.
- Main email: m1@magicmet.ru.
- Main phone: +7 (351) 751-23-35.
- Do not invent stock, delivery times, project experience, tonnage, certificates, warehouses, or offices.

## Architecture
- Keep the current site static HTML, CSS, and JavaScript until the SaaS API contract is ready.
- Hosting and form handling: Netlify.
- Source control and CI: GitHub.
- Future SaaS integration must go through a server-side function. Never expose SaaS tokens in browser code.
- The current MVP accepts a text request. File upload is postponed until storage, malware scanning, and the end-to-end attachment contract are approved.

## Required checks after changes
Run:

```bash
npm install
npx playwright install chromium
npm run validate:html
npm run test:e2e
npm run lighthouse
```

## Form requirements
- A request is valid when the visitor supplies name, phone or e-mail, request text, and consent.
- Preserve UTM, yclid, gclid, referrer, landing page, and anonymous session ID.
- Do not add a file field until the attachment workflow is approved and tested end to end.
- Do not claim a form is working in production until a real submission appears in the Netlify dashboard or the SaaS lead inbox.

## Design rules
- Premium industrial style: white, deep navy, restrained blue accents, strong typography, generous spacing.
- Mobile-first and no horizontal scrolling.
- One primary call to action: send a request/specification.
- Aerial delivery is presented for urgent, compact, business-critical cargo to northern and hard-to-reach regions, not as the default method for heavy steel lots.

## Tooling
- Playwright MCP is declared in `.mcp.json` for browser inspection by compatible agents.
- Playwright tests cover desktop, mobile, form validation, text submission, Gateway fallback, and visual regression.
- GitHub Actions validates HTML, runs browser tests, Lighthouse, and broken-link checks.
- Dependabot maintains npm and GitHub Action versions weekly.

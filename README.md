# Aftab Labs website

Official static website for Aftab Labs, HisabApp, Modulora ERP, Learnova, Nexora ERP, and related technology services.

## Public pages

- `index.html` — homepage and navigation hub
- `products.html` — complete product portfolio and current status
- `hisabapp.html` — HisabApp product page
- `modulora-erp.html` — Modulora ERP product page
- `learnova.html` — Learnova product page
- `nexora-erp.html` — Nexora ERP planning page
- `workledger-erp.html` — legacy redirect to Modulora ERP
- `services.html` — technology services
- `about.html` — company information
- `contact.html` — contact details and project enquiry form
- `privacy.html` — website privacy summary and link to the published HisabApp privacy policy

The site remains plain HTML, CSS, and JavaScript so it can deploy through the existing GitHub integration on Cloudflare Pages Free.

## Contact endpoint

Cloudflare Pages serves `functions/api/contact.js` at `/api/contact`. Configure these environment variables in the Cloudflare Pages project before enabling production form delivery:

- `SITE_ORIGIN` — the exact public origin, such as `https://aftablabs.com`
- `CONTACT_WEBHOOK_URL` — a secret server-side delivery or storage webhook

The webhook URL must be stored as a Cloudflare secret and must never be added to frontend code or committed to the repository. Without it, the form returns a safe message directing visitors to email Aftab Labs.

## Internal planning

`ROADMAP.md` is internal repository documentation and is not linked from the public website.

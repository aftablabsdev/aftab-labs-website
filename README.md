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

The site remains plain HTML, CSS, and JavaScript so it can deploy through the existing GitHub integration on Cloudflare's free Workers/Pages-compatible static hosting. `wrangler.json` keeps the site static and routes only `/api/*` through the lightweight Worker runtime.

## Contact endpoint

The Worker entrypoint serves the static files and routes `/api/contact` to `functions/api/contact.js`. Configure these environment variables in the Cloudflare project before enabling production form delivery:

- `SITE_ORIGIN` — the exact public origin, such as `https://aftablabs.com`
- `CONTACT_FROM_EMAIL` — the verified Brevo sender, such as `no-reply@aftablabs.com`
- `CONTACT_TO_EMAIL` — the internal recipient for enquiries
- `CONTACT_REPLY_TO_EMAIL` — the reply address used by the visitor confirmation
- `CONTACT_CONFIRMATION_TEMPLATE_ID` — the numeric ID of the active Brevo acknowledgement template
- `BREVO_API_KEY` — an encrypted secret used only by the Pages Function
- `TURNSTILE_SECRET_KEY` — an encrypted secret used for mandatory server-side Turnstile validation

The public Turnstile site key is embedded in `contact.html`; the Brevo API key and Turnstile secret must never be added to frontend code or committed to the repository. The endpoint validates the form, honeypot, origin, payload size, Turnstile token, and a short abuse-prevention window before delivering the internal enquiry. It then sends a separate acknowledgement through the configured Brevo template.

## Internal planning

`ROADMAP.md` is internal repository documentation and is not linked from the public website.

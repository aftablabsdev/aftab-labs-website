# Aftab Labs Website Roadmap

Internal planning document. This roadmap must not be displayed or linked from the public website.

## Direction

Convert the current single-page static website into a proper multi-page static website while continuing to use Cloudflare Pages Free and the existing GitHub-based deployment.

## Planned page structure

- Home — shorter introduction and navigation hub
- HisabApp — dedicated SEO-focused product page
- WorkLedger ERP — dedicated SEO-focused product page
- Services
- About
- Contact
- Privacy

## Product page requirements

Each major product page should have its own:

- SEO-focused title and meta description
- Clear H1/H2 content structure
- Canonical URL
- OpenGraph metadata
- Appropriate schema markup
- Internal links to related pages
- Screenshots, features, roadmap highlights, and clear CTAs

## Content preservation

Redistribute useful existing content across the appropriate pages while preserving:

- Existing Aftab Labs branding
- Google verification
- Google Play Store links
- QR codes
- Product screenshots
- Contact details
- Other useful product and company content

## Future Contact Us implementation

Add a Contact Us form backed by an API or backend endpoint rather than relying only on static contact information. The implementation should provide:

- Client and server-side validation
- Cloudflare Turnstile verification and basic rate limiting for spam and abuse protection
- Secure submission
- Transactional email delivery through Brevo
- No exposed secrets in frontend code

### Planned Brevo email flow

After a valid contact form submission passes all anti-spam checks:

1. Send the full enquiry to `info@aftablabs.com`.
2. Set the visitor's name and email as the `Reply-To` details on the internal notification so the team can reply directly.
3. After Brevo accepts the internal notification, send a separate acknowledgement email to the visitor confirming that the enquiry was received and that Aftab Labs will respond.
4. Send the acknowledgement as `Aftab Labs <no-reply@aftablabs.com>` and set `Reply-To` to `info@aftablabs.com`.
5. Treat acknowledgement delivery as secondary: a failure to send it must be recorded, but must not discard an enquiry that was already delivered internally.

The acknowledgement should use a dedicated, activated Brevo transactional template with the visitor's name supplied as a template parameter. It should not repeat the submitted message or include promotional content.

### Brevo and Cloudflare configuration

- Authenticate the `aftablabs.com` sending domain in Brevo using the required DKIM and DMARC records.
- Register `no-reply@aftablabs.com` as a Brevo transactional sender; optionally maintain it as an email alias.
- Use a dedicated Brevo API key for the website contact form rather than reusing product OTP credentials.
- Store `BREVO_API_KEY` and `TURNSTILE_SECRET_KEY` as encrypted Cloudflare secrets.
- Configure non-secret values such as `SITE_ORIGIN`, `CONTACT_FROM_EMAIL`, `CONTACT_TO_EMAIL`, and `CONTACT_CONFIRMATION_TEMPLATE_ID` as Cloudflare environment variables.
- Place only the public Turnstile site key in the frontend; never expose the Brevo API key or Turnstile secret.
- Keep recipients and sender addresses controlled by server-side configuration so the endpoint cannot be used as an open email relay.
- Do not send either email until server-side validation, honeypot checks, Turnstile verification, origin checks, payload limits, and rate limits pass.
- Avoid logging message contents, API keys, or other unnecessary personal information.

## Technical constraints

- Keep the website primarily static for speed, security, SEO, and free Cloudflare hosting.
- Preserve the existing GitHub-based deployment workflow.
- Avoid converting the site into a heavy dynamic application unnecessarily.
- Implementation has begun: the static page structure and contact endpoint boundary are now in place.
- Contact delivery will replace the temporary generic `CONTACT_WEBHOOK_URL` design with direct Brevo transactional-email API integration.
- Production activation will require the Brevo sender/template setup, Cloudflare environment variables and secrets, Turnstile keys, and the matching `SITE_ORIGIN` configuration described above.

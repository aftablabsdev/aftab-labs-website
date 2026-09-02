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
- Spam protection
- Secure submission
- Delivery and/or storage of messages
- No exposed secrets in frontend code

## Technical constraints

- Keep the website primarily static for speed, security, SEO, and free Cloudflare hosting.
- Preserve the existing GitHub-based deployment workflow.
- Avoid converting the site into a heavy dynamic application unnecessarily.
- Implementation has begun: the static page structure and contact endpoint boundary are now in place.
- Contact delivery still requires a production `CONTACT_WEBHOOK_URL` secret and matching `SITE_ORIGIN` configuration before the form can send messages.

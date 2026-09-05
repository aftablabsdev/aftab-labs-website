const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const TURNSTILE_ENDPOINT = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT_SECONDS = 45;
const localRateLimits = new Map();

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const counterpartHostname = (hostname) => hostname.startsWith("www.") ? hostname.slice(4) : `www.${hostname}`;

const siteSettings = (env) => {
  const siteUrl = new URL(env.SITE_ORIGIN);
  const siteHostname = siteUrl.hostname.toLowerCase();
  const hostnames = new Set([siteHostname, counterpartHostname(siteHostname)]);
  const origins = new Set([...hostnames].map((hostname) => `${siteUrl.protocol}//${hostname}${siteUrl.port ? `:${siteUrl.port}` : ""}`));
  return { hostnames, origins };
};

const verifyTurnstile = async ({ token, secret, remoteIp, allowedHostnames }) => {
  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  if (remoteIp) body.set("remoteip", remoteIp);

  const response = await fetch(TURNSTILE_ENDPOINT, { method: "POST", body });
  if (!response.ok) throw new Error(`Turnstile verification failed with status ${response.status}.`);

  const result = await response.json();
  return result.success === true
    && result.action === "contact"
    && allowedHostnames.has(String(result.hostname || "").toLowerCase());
};

const hashValue = async (value) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const isRateLimited = async (request, email) => {
  const clientAddress = request.headers.get("CF-Connecting-IP") || "unknown";
  const key = await hashValue(`${clientAddress}:${email.toLowerCase()}`);
  const now = Date.now();
  const localExpiry = localRateLimits.get(key) || 0;
  if (localExpiry > now) return true;

  localRateLimits.set(key, now + RATE_LIMIT_SECONDS * 1000);
  if (localRateLimits.size > 500) {
    for (const [storedKey, expiry] of localRateLimits) {
      if (expiry <= now) localRateLimits.delete(storedKey);
    }
  }

  const cache = globalThis.caches && globalThis.caches.default;
  if (!cache) return false;

  const cacheKeyUrl = new URL(request.url);
  cacheKeyUrl.pathname = `/.contact-rate-limit/${key}`;
  cacheKeyUrl.search = "";
  const cacheKey = new Request(cacheKeyUrl, { method: "GET" });
  try {
    if (await cache.match(cacheKey)) return true;
    await cache.put(cacheKey, new Response("", {
      headers: { "Cache-Control": `public, max-age=${RATE_LIMIT_SECONDS}` },
    }));
  } catch {
    // The local limiter still protects this isolate if the edge cache is unavailable.
  }
  return false;
};

const sendBrevoEmail = async (apiKey, payload) => {
  const response = await fetch(BREVO_ENDPOINT, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Brevo delivery failed with status ${response.status}.`);
};

const internalEmail = ({ name, email, message, receivedAt, env }) => ({
  sender: { name: "Aftab Labs", email: env.CONTACT_FROM_EMAIL },
  to: [{ name: "Aftab Labs", email: env.CONTACT_TO_EMAIL }],
  replyTo: { name, email },
  subject: `Website enquiry from ${name.replace(/[\r\n]+/g, " ")}`,
  textContent: `New website enquiry\n\nName: ${name}\nEmail: ${email}\nReceived: ${receivedAt}\n\nMessage:\n${message}`,
  htmlContent: `<h1>New website enquiry</h1><p><strong>Name:</strong> ${escapeHtml(name)}<br><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a><br><strong>Received:</strong> ${escapeHtml(receivedAt)}</p><h2>Message</h2><p>${escapeHtml(message).replaceAll("\n", "<br>")}</p>`,
  tags: ["website-contact"],
});

const confirmationEmail = ({ name, email, env, templateId }) => ({
  sender: { name: "Aftab Labs", email: env.CONTACT_FROM_EMAIL },
  to: [{ name, email }],
  replyTo: { name: "Aftab Labs", email: env.CONTACT_REPLY_TO_EMAIL },
  templateId,
  params: { contact_name: name },
  tags: ["website-contact-confirmation"],
});

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");
  let settings;
  try {
    settings = siteSettings(env);
  } catch {
    return json({ error: "Contact delivery is not configured yet. Please email info@aftablabs.com directly." }, 503);
  }
  if (!origin || !settings.origins.has(origin)) return json({ error: "Origin not allowed." }, 403);

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 20_000) return json({ error: "Form submission is too large." }, 413);

  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.includes("multipart/form-data") && !contentType.includes("application/x-www-form-urlencoded")) {
    return json({ error: "Invalid form submission." }, 415);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Invalid form submission." }, 400);
  }

  if (String(form.get("company") || "").trim()) return json({ message: "Thanks." });

  const name = String(form.get("name") || "").trim();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const message = String(form.get("message") || "").trim();
  const turnstileToken = String(form.get("cf-turnstile-response") || "").trim();
  if (name.length < 2 || name.length > 100 || email.length > 160 || !EMAIL_PATTERN.test(email) || message.length < 10 || message.length > 4000) {
    return json({ error: "Please provide a valid name, email address, and message." }, 422);
  }
  if (!turnstileToken || turnstileToken.length > 2048) return json({ error: "Please complete the security check and try again." }, 422);

  const templateId = Number(env.CONTACT_CONFIRMATION_TEMPLATE_ID);
  if (!env.BREVO_API_KEY || !env.TURNSTILE_SECRET_KEY || !EMAIL_PATTERN.test(env.CONTACT_FROM_EMAIL || "") || !EMAIL_PATTERN.test(env.CONTACT_TO_EMAIL || "") || !EMAIL_PATTERN.test(env.CONTACT_REPLY_TO_EMAIL || "") || !Number.isInteger(templateId) || templateId < 1) {
    return json({ error: "Contact delivery is not configured yet. Please email info@aftablabs.com directly." }, 503);
  }

  try {
    const verified = await verifyTurnstile({
      token: turnstileToken,
      secret: env.TURNSTILE_SECRET_KEY,
      remoteIp: request.headers.get("CF-Connecting-IP"),
      allowedHostnames: settings.hostnames,
    });
    if (!verified) return json({ error: "The security check could not be verified. Please try again." }, 422);
  } catch {
    return json({ error: "The security check is temporarily unavailable. Please try again shortly." }, 502);
  }

  if (await isRateLimited(request, email)) {
    return new Response(JSON.stringify({ error: "Please wait a moment before sending another enquiry." }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Retry-After": String(RATE_LIMIT_SECONDS),
      },
    });
  }

  const receivedAt = new Date().toISOString();
  try {
    await sendBrevoEmail(env.BREVO_API_KEY, internalEmail({ name, email, message, receivedAt, env }));
  } catch {
    return json({ error: "We could not deliver your enquiry. Please email info@aftablabs.com directly." }, 502);
  }

  try {
    await sendBrevoEmail(env.BREVO_API_KEY, confirmationEmail({ name, email, env, templateId }));
  } catch (error) {
    console.error("Contact acknowledgement delivery failed after the enquiry was accepted.", error.message);
  }

  return json({ message: "Thank you—your enquiry has been received. We’ll get back to you soon." });
}

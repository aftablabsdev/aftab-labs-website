const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");
  const allowedOrigin = env.SITE_ORIGIN ? new URL(env.SITE_ORIGIN).origin : new URL(request.url).origin;
  if (origin && origin !== allowedOrigin) return json({ error: "Origin not allowed." }, 403);

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 20_000) return json({ error: "Form submission is too large." }, 413);

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Invalid form submission." }, 400);
  }

  if (String(form.get("company") || "").trim()) return json({ message: "Thanks." });

  const name = String(form.get("name") || "").trim();
  const email = String(form.get("email") || "").trim();
  const message = String(form.get("message") || "").trim();
  if (name.length < 2 || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 10 || message.length > 4000) {
    return json({ error: "Please provide a valid name, email address, and message." }, 422);
  }

  if (!env.CONTACT_WEBHOOK_URL) return json({ error: "Contact delivery is not configured yet. Please email info@aftablabs.com directly." }, 503);

  let delivery;
  try {
    delivery = await fetch(env.CONTACT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, message, source: "aftablabs.com", receivedAt: new Date().toISOString() }),
    });
  } catch {
    return json({ error: "We could not deliver your enquiry. Please email us directly." }, 502);
  }
  if (!delivery.ok) return json({ error: "We could not deliver your enquiry. Please email us directly." }, 502);
  return json({ message: "Thanks—your enquiry has been sent." });
}

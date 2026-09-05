import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../functions/api/contact.js", import.meta.url), "utf8");
const { onRequestPost } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

const defaultEnv = {
  SITE_ORIGIN: "https://aftablabs.com",
  BREVO_API_KEY: "test-api-key",
  TURNSTILE_SECRET_KEY: "test-turnstile-secret",
  CONTACT_FROM_EMAIL: "no-reply@aftablabs.com",
  CONTACT_TO_EMAIL: "info@aftablabs.com",
  CONTACT_REPLY_TO_EMAIL: "info@aftablabs.com",
  CONTACT_CONFIRMATION_TEMPLATE_ID: "1",
};

const submission = ({ origin = "https://aftablabs.com", ip = "203.0.113.10", fields = {} } = {}) => {
  const form = new FormData();
  Object.entries({
    name: "Farhat",
    email: "visitor@example.com",
    message: "I would like to discuss a software project.",
    company: "",
    "cf-turnstile-response": "valid-token",
    ...fields,
  }).forEach(([key, value]) => form.set(key, value));

  return new Request("https://aftablabs.com/api/contact", {
    method: "POST",
    headers: { Origin: origin, "CF-Connecting-IP": ip },
    body: form,
  });
};

const responseBody = async (response) => ({ status: response.status, body: await response.json() });

test("delivers the enquiry and personalized acknowledgement", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes("siteverify")) {
      return Response.json({ success: true, hostname: "aftablabs.com", action: "contact" });
    }
    return Response.json({ messageId: "test-message-id" }, { status: 201 });
  };

  const result = await responseBody(await onRequestPost({ request: submission(), env: defaultEnv }));
  assert.equal(result.status, 200);
  assert.match(result.body.message, /received/i);
  assert.equal(calls.length, 3);

  const internal = JSON.parse(calls[1].options.body);
  assert.equal(internal.to[0].email, "info@aftablabs.com");
  assert.equal(internal.replyTo.email, "visitor@example.com");
  assert.match(internal.htmlContent, /software project/);

  const acknowledgement = JSON.parse(calls[2].options.body);
  assert.equal(acknowledgement.templateId, 1);
  assert.equal(acknowledgement.to[0].email, "visitor@example.com");
  assert.equal(acknowledgement.params.contact_name, "Farhat");
});

test("rejects a failed Turnstile verification before email delivery", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return Response.json({ success: false, hostname: "aftablabs.com", action: "contact" });
  };

  const result = await responseBody(await onRequestPost({
    request: submission({ ip: "203.0.113.11" }),
    env: defaultEnv,
  }));
  assert.equal(result.status, 422);
  assert.equal(calls, 1);
});

test("does not send an acknowledgement when internal delivery fails", async () => {
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls += 1;
    if (String(url).includes("siteverify")) {
      return Response.json({ success: true, hostname: "aftablabs.com", action: "contact" });
    }
    return Response.json({ message: "rejected" }, { status: 400 });
  };

  const result = await responseBody(await onRequestPost({
    request: submission({ ip: "203.0.113.12" }),
    env: defaultEnv,
  }));
  assert.equal(result.status, 502);
  assert.equal(calls, 2);
});

test("keeps the enquiry successful if only acknowledgement delivery fails", async () => {
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls += 1;
    if (String(url).includes("siteverify")) {
      return Response.json({ success: true, hostname: "aftablabs.com", action: "contact" });
    }
    if (calls === 2) return Response.json({ messageId: "internal-id" }, { status: 201 });
    return Response.json({ message: "rejected" }, { status: 400 });
  };

  const originalError = console.error;
  console.error = () => {};
  try {
    const result = await responseBody(await onRequestPost({
      request: submission({ ip: "203.0.113.13" }),
      env: defaultEnv,
    }));
    assert.equal(result.status, 200);
    assert.equal(calls, 3);
  } finally {
    console.error = originalError;
  }
});

test("rejects requests from unapproved origins", async () => {
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return Response.json({});
  };

  const result = await responseBody(await onRequestPost({
    request: submission({ origin: "https://example.com", ip: "203.0.113.14" }),
    env: defaultEnv,
  }));
  assert.equal(result.status, 403);
  assert.equal(called, false);
});

test("silently accepts honeypot submissions without external calls", async () => {
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return Response.json({});
  };

  const result = await responseBody(await onRequestPost({
    request: submission({ ip: "203.0.113.15", fields: { company: "Bot Company" } }),
    env: defaultEnv,
  }));
  assert.equal(result.status, 200);
  assert.equal(called, false);
});

test("accepts the authorized www hostname", async () => {
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls += 1;
    if (String(url).includes("siteverify")) {
      return Response.json({ success: true, hostname: "www.aftablabs.com", action: "contact" });
    }
    return Response.json({ messageId: "test-message-id" }, { status: 201 });
  };

  const request = submission({ origin: "https://www.aftablabs.com", ip: "203.0.113.16" });
  const result = await responseBody(await onRequestPost({ request, env: defaultEnv }));
  assert.equal(result.status, 200);
  assert.equal(calls, 3);
});

test("rate limits repeated submissions from the same visitor", async () => {
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls += 1;
    if (String(url).includes("siteverify")) {
      return Response.json({ success: true, hostname: "aftablabs.com", action: "contact" });
    }
    return Response.json({ messageId: "test-message-id" }, { status: 201 });
  };

  const first = await onRequestPost({
    request: submission({ ip: "203.0.113.17", fields: { email: "repeat@example.com" } }),
    env: defaultEnv,
  });
  const second = await onRequestPost({
    request: submission({ ip: "203.0.113.17", fields: { email: "repeat@example.com", "cf-turnstile-response": "another-token" } }),
    env: defaultEnv,
  });

  assert.equal(first.status, 200);
  assert.equal(second.status, 429);
  assert.equal(second.headers.get("Retry-After"), "45");
  assert.equal(calls, 4);
});

import { onRequestPost } from "./functions/api/contact.js";

const canonicalPages = new Set([
  "/about.html",
  "/contact.html",
  "/hisabapp.html",
  "/index.html",
  "/learnova.html",
  "/modulora-erp.html",
  "/nexora-erp.html",
  "/privacy.html",
  "/products.html",
  "/services.html",
]);

const canonicalRedirect = (url) => {
  let shouldRedirect = false;

  if (url.hostname === "www.aftablabs.com") {
    url.hostname = "aftablabs.com";
    shouldRedirect = true;
  }

  if (canonicalPages.has(url.pathname)) {
    url.pathname = url.pathname === "/index.html" ? "/" : url.pathname.slice(0, -5);
    shouldRedirect = true;
  }

  return shouldRedirect ? Response.redirect(url.toString(), 308) : null;
};

const apiMethodNotAllowed = () => new Response(JSON.stringify({ error: "Method not allowed." }), {
  status: 405,
  headers: {
    Allow: "POST",
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
  },
});

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const redirect = canonicalRedirect(url);
    if (redirect) return redirect;

    const { pathname } = url;

    if (pathname === "/api/contact") {
      if (request.method !== "POST") return apiMethodNotAllowed();
      return onRequestPost({ request, env, ctx });
    }

    return env.ASSETS.fetch(request);
  },
};

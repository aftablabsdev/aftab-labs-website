import { onRequestPost } from "./functions/api/contact.js";

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
    const { pathname } = new URL(request.url);

    if (pathname === "/api/contact") {
      if (request.method !== "POST") return apiMethodNotAllowed();
      return onRequestPost({ request, env, ctx });
    }

    return env.ASSETS.fetch(request);
  },
};

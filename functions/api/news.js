/**
 * /api/news  — Finnhub news proxy
 *
 * Replaces Yahoo Finance RSS + allorigins.win proxy scraping.
 * Uses Finnhub /api/v1/news (official API, no scraping).
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function onRequestGet({ request, env }) {
  const KEY = env.FINNHUB_API_KEY || "";
  if (!KEY) {
    return json({ error: "FINNHUB_API_KEY not set" }, 500);
  }

  const url = new URL(request.url);
  const category = url.searchParams.get("category") || "general";

  const apiUrl = `https://finnhub.io/api/v1/news?category=${encodeURIComponent(category)}&token=${KEY}`;

  try {
    const res = await fetch(apiUrl, { headers: { Accept: "application/json" } });
    if (!res.ok) return json({ error: `Finnhub HTTP ${res.status}` }, res.status);

    const articles = await res.json();
    if (!Array.isArray(articles)) return json({ items: [] }, 200);

    const items = articles.slice(0, 30).map(a => ({
      title:       a.headline || "Untitled",
      link:        a.url || "",
      source:      a.source || "Finnhub",
      publishedAt: a.datetime ? new Date(a.datetime * 1000).toISOString() : new Date().toISOString(),
      summary:     a.summary || "",
      image:       a.image || null,
    }));

    return json({ items }, 200, {
      "Cache-Control": "s-maxage=300, max-age=300",
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", ...extra },
  });
}

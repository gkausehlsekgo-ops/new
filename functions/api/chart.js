/**
 * /api/chart  — Finnhub-based chart proxy with Yahoo Finance fallback
 *
 * Cloudflare Pages Function.
 * Requires environment variable: FINNHUB_API_KEY
 * Set it in Cloudflare Pages → Settings → Environment variables.
 *
 * - If FINNHUB_API_KEY is set:   tries Finnhub /stock/candle (or /crypto/candle)
 *   Falls back to Yahoo Finance if Finnhub returns no data (e.g. index symbols).
 * - If FINNHUB_API_KEY is not set: proxies Yahoo Finance directly (legacy behavior).
 *
 * Returns response shaped like Yahoo Finance v8 chart API
 * so frontend code needs no changes.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Yahoo Finance symbol → Finnhub symbol
// null = not on Finnhub free tier → Yahoo Finance fallback
const SYMBOL_MAP = {
  "^GSPC":   "^GSPC",             // S&P 500  (may fall back if unsupported)
  "^IXIC":   "^IXIC",             // NASDAQ Composite
  "^DJI":    "^DJI",              // Dow Jones
  "^KS11":   null,                // KOSPI  → Yahoo fallback
  "^KQ11":   null,                // KOSDAQ → Yahoo fallback
  "BTC-USD": "COINBASE:BTC-USD",  // Bitcoin
  "ETH-USD": "COINBASE:ETH-USD",  // Ethereum
  "MNQ=F":   null,                // Micro NQ futures → Yahoo fallback
  "NQ=F":    null,                // NQ futures → Yahoo fallback
};

// Yahoo Finance interval → Finnhub resolution
const INTERVAL_TO_RES = {
  "1m":  "1",
  "2m":  "1",
  "5m":  "5",
  "15m": "15",
  "30m": "30",
  "60m": "60",
  "90m": "60",
  "1h":  "60",
  "1d":  "D",
  "5d":  "W",
  "1wk": "W",
  "1mo": "M",
  "3mo": "M",
};

// Yahoo Finance range → look-back seconds from now
const RANGE_SECS = {
  "1d":  86_400,
  "5d":  5 * 86_400,
  "1mo": 30 * 86_400,
  "3mo": 90 * 86_400,
  "6mo": 180 * 86_400,
  "1y":  365 * 86_400,
  "2y":  2 * 365 * 86_400,
  "5y":  5 * 365 * 86_400,
  "10y": 10 * 365 * 86_400,
  "max": 20 * 365 * 86_400,
};

export async function onRequestGet({ request, env }) {
  const url      = new URL(request.url);
  const yahooSym = url.searchParams.get("symbol")   || "AAPL";
  const range    = url.searchParams.get("range")     || "1d";
  const interval = url.searchParams.get("interval")  || "1m";

  const KEY = env.FINNHUB_API_KEY || "";

  // No key → legacy Yahoo Finance proxy
  if (!KEY) return proxyYahoo(yahooSym, range, interval);

  const finnhubSym = yahooSym in SYMBOL_MAP ? SYMBOL_MAP[yahooSym] : yahooSym;

  // null means symbol not supported on Finnhub → Yahoo fallback
  if (!finnhubSym) return proxyYahoo(yahooSym, range, interval);

  const resolution = INTERVAL_TO_RES[interval] || "D";

  const now = Math.floor(Date.now() / 1000);
  const from =
    range === "ytd"
      ? Math.floor(new Date(new Date().getFullYear(), 0, 1).getTime() / 1000)
      : now - (RANGE_SECS[range] ?? 86_400);

  // Crypto symbols contain ":" (e.g. COINBASE:BTC-USD)
  const isCrypto = finnhubSym.includes(":");
  const endpoint = isCrypto ? "crypto/candle" : "stock/candle";

  const apiUrl =
    `https://finnhub.io/api/v1/${endpoint}` +
    `?symbol=${encodeURIComponent(finnhubSym)}` +
    `&resolution=${resolution}` +
    `&from=${from}&to=${now}` +
    `&token=${KEY}`;

  try {
    const res = await fetch(apiUrl, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Finnhub HTTP ${res.status}`);

    const d = await res.json();

    // s !== "ok" or empty timestamps → Finnhub has no data for this symbol/range
    if (d.s !== "ok" || !Array.isArray(d.t) || d.t.length === 0) {
      return proxyYahoo(yahooSym, range, interval);
    }

    // Transform Finnhub candle → Yahoo Finance v8 chart shape
    const body = JSON.stringify({
      chart: {
        result: [
          {
            meta: {
              symbol:               yahooSym,
              regularMarketPrice:   d.c.at(-1),
              chartPreviousClose:   d.o[0],
            },
            timestamp:  d.t,
            indicators: {
              quote: [
                {
                  open:   d.o,
                  high:   d.h,
                  low:    d.l,
                  close:  d.c,
                  volume: d.v,
                },
              ],
            },
          },
        ],
        error: null,
      },
    });

    return new Response(body, {
      status: 200,
      headers: {
        ...CORS,
        "Content-Type":  "application/json; charset=utf-8",
        "Cache-Control": "s-maxage=30, max-age=30",
      },
    });
  } catch {
    // Any fetch/parse error → fall back to Yahoo Finance
    return proxyYahoo(yahooSym, range, interval);
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

// ─── helpers ────────────────────────────────────────────────────────────────

async function proxyYahoo(symbol, range, interval) {
  const target = new URL(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`
  );
  target.searchParams.set("range",          range);
  target.searchParams.set("interval",       interval);
  target.searchParams.set("includePrePost", "false");
  target.searchParams.set("events",         "div,splits");

  const res = await fetch(target.toString(), {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept":     "application/json,text/plain,*/*",
    },
  });

  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: {
      ...CORS,
      "Content-Type":  "application/json; charset=utf-8",
      "Cache-Control": "s-maxage=10, max-age=10",
    },
  });
}

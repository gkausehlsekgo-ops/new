/**
 * /api/quote  — Finnhub-based quote proxy with Yahoo Finance fallback
 *
 * Cloudflare Pages Function.
 * Requires environment variable: FINNHUB_API_KEY
 *
 * Priority:
 *   1. Finnhub /api/v1/quote  (stocks, crypto)
 *   2. Yahoo Finance chart meta (indices & symbols Finnhub free tier doesn't support)
 *
 * Returns response shaped like Yahoo Finance quoteResponse
 * so frontend code needs no changes.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Yahoo Finance symbol → Finnhub symbol
// null = Finnhub free tier doesn't support → fall back to Yahoo Finance chart meta
const SYMBOL_MAP = {
  "^GSPC":   null,                // S&P 500  — Finnhub free returns wrong price
  "^IXIC":   null,                // NASDAQ   — same
  "^DJI":    null,                // Dow Jones — same
  "^KS11":   null,                // KOSPI    — not on Finnhub free
  "^KQ11":   null,                // KOSDAQ   — not on Finnhub free
  "BTC-USD": "COINBASE:BTC-USD",  // Bitcoin
  "ETH-USD": "COINBASE:ETH-USD",  // Ethereum
  "MNQ=F":   null,                // Micro NQ futures
  "NQ=F":    null,                // NQ futures
};

// Market-cap estimates (USD) used when API doesn't return marketCap.
const MARKET_CAP_EST = {
  NVDA: 3_300e9, AAPL: 3_000e9, MSFT: 2_800e9, GOOGL: 2_100e9,
  AMZN: 2_200e9, META: 1_600e9, TSLA: 1_100e9, AVGO:   900e9,
  JPM:   700e9,  WMT:   750e9,  LLY:   700e9,  XOM:    530e9,
  HD:    365e9,  BAC:   360e9,  JNJ:   360e9,  PG:     350e9,
  ABBV:  340e9,  WFC:   290e9,  KO:    260e9,  CVX:    270e9,
  MRK:   220e9,  GE:    215e9,  MCD:   215e9,  IBM:    215e9,
  CSCO:  225e9,  RY:    175e9,  TXN:   175e9,  PM:     175e9,
  VZ:    170e9,  QCOM:  165e9,  T:     165e9,  RTX:    195e9,
  BLK:   155e9,  AMGN:  155e9,  PFE:   155e9,  CAT:    190e9,
  SCHW:  130e9,  NEE:   135e9,  DE:    135e9,  LOW:    145e9,
  LMT:   115e9,  PLD:   100e9,  BMY:   100e9,  UPS:     95e9,
  BP:     95e9,  MO:     90e9,  SO:     90e9,  INTC:    80e9,
  MMM:    75e9,  USB:    75e9,  SPG:    60e9,  AEP:     55e9,
  O:      55e9,  TROW:   23e9,
};

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const symbols = url.searchParams.get("symbols") || "";

  if (!symbols) {
    return json({ error: "symbols param required" }, 400);
  }

  const KEY = env.FINNHUB_API_KEY || "";
  if (!KEY) {
    return json({ error: "FINNHUB_API_KEY not set" }, 500);
  }

  const list = symbols.split(",").map(s => s.trim()).filter(Boolean);

  const settled = await Promise.allSettled(
    list.map(yahooSym => fetchOne(yahooSym, KEY))
  );

  const result = settled
    .map(r => (r.status === "fulfilled" ? r.value : null))
    .filter(Boolean);

  return json({ quoteResponse: { result, error: null } }, 200, {
    "Cache-Control": "s-maxage=10, max-age=10",
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

// ─── helpers ────────────────────────────────────────────────────────────────

async function fetchOne(yahooSym, key) {
  const finnhubSym = yahooSym in SYMBOL_MAP ? SYMBOL_MAP[yahooSym] : yahooSym;

  // null → Finnhub doesn't support this symbol → fall back to Yahoo Finance
  if (!finnhubSym) return fetchYahooQuote(yahooSym);

  const res = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(finnhubSym)}&token=${key}`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) return null;

  const d = await res.json();
  // Finnhub returns c=0 for unknown / unsupported symbols
  if (typeof d.c !== "number" || d.c === 0) return null;

  return {
    symbol:                      yahooSym,
    regularMarketPrice:          d.c,
    regularMarketPreviousClose:  d.pc,
    regularMarketChangePercent:  d.dp,
    regularMarketChange:         d.d,
    regularMarketOpen:           d.o,
    regularMarketDayHigh:        d.h,
    regularMarketDayLow:         d.l,
    regularMarketTime:           d.t,
    regularMarketVolume:         null,
    marketCap:                   MARKET_CAP_EST[yahooSym] ?? null,
    trailingAnnualDividendYield: null,
    trailingAnnualDividendRate:  null,
  };
}

// Fetch current price from Yahoo Finance chart meta (used for indices & futures)
async function fetchYahooQuote(symbol) {
  try {
    const target = new URL(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`
    );
    target.searchParams.set("range", "1d");
    target.searchParams.set("interval", "1m");
    target.searchParams.set("includePrePost", "false");

    const res = await fetch(target.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept":     "application/json,text/plain,*/*",
      },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta || typeof meta.regularMarketPrice !== "number") return null;

    const price = meta.regularMarketPrice;
    const prev  = meta.chartPreviousClose ?? null;

    return {
      symbol,
      regularMarketPrice:          price,
      regularMarketPreviousClose:  prev,
      regularMarketChangePercent:  (price && prev) ? ((price - prev) / prev) * 100 : null,
      regularMarketChange:         (price && prev) ? price - prev : null,
      regularMarketOpen:           null,
      regularMarketDayHigh:        meta.regularMarketDayHigh  ?? null,
      regularMarketDayLow:         meta.regularMarketDayLow   ?? null,
      regularMarketTime:           meta.regularMarketTime      ?? null,
      regularMarketVolume:         null,
      marketCap:                   MARKET_CAP_EST[symbol] ?? null,
      trailingAnnualDividendYield: null,
      trailingAnnualDividendRate:  null,
    };
  } catch { return null; }
}

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS,
      "Content-Type": "application/json; charset=utf-8",
      ...extra,
    },
  });
}

/**
 * /api/quote  — Finnhub-based quote proxy
 *
 * Cloudflare Pages Function.
 * Requires environment variable: FINNHUB_API_KEY
 * Set it in Cloudflare Pages → Settings → Environment variables.
 *
 * Returns response shaped like Yahoo Finance quoteResponse
 * so frontend code needs no changes.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Yahoo Finance symbol  →  Finnhub symbol
// null = not supported on Finnhub free tier → filtered out (fallback to demo on frontend)
const SYMBOL_MAP = {
  "^GSPC":   "^GSPC",             // S&P 500
  "^IXIC":   "^IXIC",             // NASDAQ Composite
  "^DJI":    "^DJI",              // Dow Jones
  "^KS11":   null,                // KOSPI  (not on free tier)
  "^KQ11":   null,                // KOSDAQ (not on free tier)
  "BTC-USD": "COINBASE:BTC-USD",  // Bitcoin
  "ETH-USD": "COINBASE:ETH-USD",  // Ethereum
  "MNQ=F":   null,                // Micro NQ futures
  "NQ=F":    null,                // NQ futures
};

// Market-cap estimates (USD) used when API doesn't return marketCap.
// Updated periodically — keeps dividend list market-cap sorting correct.
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
    "Cache-Control": "s-maxage=15, max-age=15",
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

// ─── helpers ────────────────────────────────────────────────────────────────

async function fetchOne(yahooSym, key) {
  const finnhubSym = yahooSym in SYMBOL_MAP ? SYMBOL_MAP[yahooSym] : yahooSym;
  if (!finnhubSym) return null;

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
    // marketCap not in basic Finnhub quote — use estimate table as fallback
    marketCap:                   MARKET_CAP_EST[yahooSym] ?? null,
    trailingAnnualDividendYield: null,
    trailingAnnualDividendRate:  null,
  };
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

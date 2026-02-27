export async function onRequestGet({ request }) {
  const url = new URL(request.url);

  const symbol = url.searchParams.get("symbol") || "AAPL";
  const range = url.searchParams.get("range") || "1d";
  const interval = url.searchParams.get("interval") || "1m";

  const target = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  target.searchParams.set("range", range);
  target.searchParams.set("interval", interval);
  target.searchParams.set("includePrePost", "false");
  target.searchParams.set("events", "div,splits");

  const res = await fetch(target.toString(), {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept": "application/json,text/plain,*/*",
    },
  });

  const text = await res.text();

  return new Response(text, {
    status: res.status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "s-maxage=10, max-age=10",
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

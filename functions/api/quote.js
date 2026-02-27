export async function onRequestGet({ request }) {
  const url = new URL(request.url);

  const symbols = url.searchParams.get("symbols") || "";
  if (!symbols) {
    return new Response(JSON.stringify({ error: "symbols param required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const target = new URL("https://query1.finance.yahoo.com/v7/finance/quote");
  target.searchParams.set("symbols", symbols);

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

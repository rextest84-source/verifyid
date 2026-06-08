const API_BASE = Deno.env.get("RAILWAY_API_URL") ?? Deno.env.get("VITE_API_URL") ?? "";

export default async function handler(request: Request): Promise<Response> {
  if (!API_BASE) {
    return new Response(
      JSON.stringify({
        error: "API not configured",
        hint: "Set RAILWAY_API_URL in Netlify environment variables to your Railway app URL.",
      }),
      { status: 503, headers: { "content-type": "application/json" } },
    );
  }

  const incoming = new URL(request.url);
  const base = API_BASE.replace(/\/$/, "");
  const target = `${base}${incoming.pathname}${incoming.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  try {
    return await fetch(target, {
      method: request.method,
      headers,
      body:
        request.method !== "GET" && request.method !== "HEAD"
          ? request.body
          : undefined,
      redirect: "manual",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upstream fetch failed";
    return new Response(
      JSON.stringify({
        error: "Could not reach Railway API",
        hint: "Check that your Railway service is running and RAILWAY_API_URL is correct.",
        detail: message,
      }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }
}

// Deprecated legacy function.
// Use supabase/functions/admin-api instead.
//
// This stub is intentionally non-privileged: if somebody deploys catalog-admin
// again by mistake, it will not expose catalog writes behind the old password
// model.

const CORS = {
  "Access-Control-Allow-Origin": "https://azimer.ru",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  return new Response(
    JSON.stringify({
      error: "catalog-admin is deprecated; use admin-api",
    }),
    {
      status: 410,
      headers: { "Content-Type": "application/json", ...CORS },
    },
  );
});

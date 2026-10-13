import defaults from "../../data/marketingTracking.json";

export const prerender = true;

export function GET() {
  return new Response(JSON.stringify({
    iubendaSiteId: Number(import.meta.env.PUBLIC_IUBENDA_SITE_ID || defaults.iubendaSiteId),
    iubendaPolicyId: Number(import.meta.env.PUBLIC_IUBENDA_COOKIE_POLICY_ID || defaults.iubendaPolicyId)
  }), { headers: { "Content-Type": "application/json; charset=utf-8" } });
}

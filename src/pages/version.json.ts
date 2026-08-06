export const prerender = true;

export function GET() {
  return new Response(JSON.stringify({
    commit: import.meta.env.PUBLIC_BUILD_SHA || "local"
  }), {
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

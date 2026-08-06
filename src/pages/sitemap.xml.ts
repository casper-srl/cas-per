import { getCollection } from "astro:content";

const staticRoutes = [
  "/",
  "/chi-siamo/",
  "/annuncifunebri/",
  "/soluzioni/",
  "/soluzioni/annunci-funebri-necrologi/",
  "/soluzioni/monitor-case-funerarie/",
  "/soluzioni/streaming-cerimonia/",
  "/soluzioni/siti-web-app-imprese-funebri/",
  "/soluzioni/gestionale-eterno/",
  "/soluzioni/editor-grafico-giotto/",
  "/eventi/",
  "/news/",
  "/dicono-di-noi/",
  "/contatti/",
];

export async function GET({ site }: { site: URL }) {
  const posts = await getCollection("blog", ({ data }) => !data.draft);
  const routes = [...staticRoutes, ...posts.map((post) => `/news/${post.id}/`)];
  const urls = routes.map((route) => `  <url><loc>${new URL(route, site)}</loc></url>`).join("\n");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
}

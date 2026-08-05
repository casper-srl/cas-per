import { getCollection } from "astro:content";

export async function GET({ site }: { site: URL }) {
  const posts = (await getCollection("blog", ({ data }) => !data.draft)).sort(
    (a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf(),
  );
  const items = posts
    .map(
      (post) => `
    <item>
      <title><![CDATA[${post.data.title}]]></title>
      <description><![CDATA[${post.data.description}]]></description>
      <link>${new URL(`/news/${post.slug}/`, site)}</link>
      <guid>${new URL(`/news/${post.slug}/`, site)}</guid>
      <pubDate>${post.data.publishedAt.toUTCString()}</pubDate>
    </item>`,
    )
    .join("");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>Cas-Per — News</title>
    <description>Guide e approfondimenti per imprese funebri.</description>
    <link>${site}</link>${items}
  </channel>
</rss>`,
    { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } },
  );
}

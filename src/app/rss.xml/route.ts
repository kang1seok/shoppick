import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const baseUrl = "https://sandamanda.vercel.app";
  
  const { data: articles } = await supabaseAdmin
    .from("articles")
    .select("title, meta_description, slug, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(50);

  const items = (articles || [])
    .map((article) => {
      return `
        <item>
          <title><![CDATA[${article.title}]]></title>
          <link>${baseUrl}/post/${article.slug}</link>
          <guid>${baseUrl}/post/${article.slug}</guid>
          <pubDate>${new Date(article.published_at).toUTCString()}</pubDate>
          <description><![CDATA[${article.meta_description}]]></description>
        </item>
      `;
    })
    .join("");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0">
    <channel>
      <title>산다만다 - AI 자동화 쇼핑 가이드</title>
      <link>${baseUrl}</link>
      <description>최적의 쿠팡 상품 추천 및 가격 비교 가이드</description>
      ${items}
    </channel>
  </rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "text/xml",
    },
  });
}

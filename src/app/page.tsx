import { supabaseAdmin } from "@/lib/supabase/server";
import { ArticleGrid, ARTICLE_CARD_SELECT, type ArticleCardData } from "@/components/ArticleCard";

export const revalidate = 0; // 임시로 캐싱 비활성화 (실시간 반영)

// 최근 30일 제휴 링크 클릭 수 기준 인기 글 (클릭 데이터가 없으면 빈 배열)
async function getPopularArticles(limit: number): Promise<ArticleCardData[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: clicks } = await supabaseAdmin
    .from("click_events")
    .select("article_id")
    .gte("clicked_at", since)
    .not("article_id", "is", null)
    .limit(10000);

  const counts = new Map<string, number>();
  for (const c of clicks || []) {
    counts.set(c.article_id, (counts.get(c.article_id) || 0) + 1);
  }
  const topIds = [...counts].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id]) => id);
  if (topIds.length === 0) return [];

  const { data } = await supabaseAdmin
    .from("articles")
    .select(ARTICLE_CARD_SELECT)
    .eq("status", "published")
    .in("id", topIds);

  const rows = (data || []) as unknown as ArticleCardData[];
  return rows.sort((a, b) => (counts.get(b.id) || 0) - (counts.get(a.id) || 0));
}

export default async function HomePage() {
  const [{ data: latestArticlesData }, popularArticles] = await Promise.all([
    supabaseAdmin
      .from("articles")
      .select(ARTICLE_CARD_SELECT)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(12),
    getPopularArticles(6),
  ]);

  const latestArticles = (latestArticlesData || []) as unknown as ArticleCardData[];

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="py-12 md:py-20 text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          실패 없는 쇼핑의 시작, <span className="text-primary">산다만다</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          AI가 매일 최신 데이터를 분석하여 가장 합리적인 제품을 추천해 드립니다.
        </p>
      </section>

      {/* 인기 쇼핑 가이드 (클릭 데이터가 쌓인 경우에만 노출) */}
      {popularArticles.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-6 flex items-center">🔥 인기 쇼핑 가이드</h2>
          <ArticleGrid
            articles={popularArticles}
            emptyText="아직 인기 글이 없습니다."
            label={(a) => a.keywords?.niches?.name || "추천"}
          />
        </section>
      )}

      {/* 최신 가이드 */}
      <section>
        <h2 className="text-2xl font-bold mb-6 flex items-center">✨ 최신 쇼핑 가이드</h2>
        <ArticleGrid articles={latestArticles} emptyText="아직 발행된 최신 글이 없습니다." />
      </section>
    </div>
  );
}

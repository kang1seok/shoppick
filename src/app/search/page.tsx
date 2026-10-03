import { supabaseAdmin } from "@/lib/supabase/server";
import { ArticleGrid, ARTICLE_CARD_SELECT, type ArticleCardData } from "@/components/ArticleCard";

export const metadata = {
  title: "검색 | 산다만다",
  robots: { index: false }, // 검색 결과 페이지는 색인 제외
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q || "").trim().slice(0, 50);

  let articles: ArticleCardData[] = [];
  if (q) {
    // PostgREST 필터 문법 문자와 LIKE 와일드카드 제거
    const term = q.replace(/[%_,()\\*]/g, " ").trim();
    if (term) {
      const { data } = await supabaseAdmin
        .from("articles")
        .select(ARTICLE_CARD_SELECT)
        .eq("status", "published")
        .or(`title.ilike.*${term}*,meta_description.ilike.*${term}*`)
        .order("published_at", { ascending: false })
        .limit(30);
      articles = (data || []) as unknown as ArticleCardData[];
    }
  }

  return (
    <div className="space-y-8">
      <header className="py-8">
        <h1 className="text-2xl font-bold">
          {q ? <>&lsquo;{q}&rsquo; 검색 결과 <span className="text-muted-foreground font-normal">{articles.length}건</span></> : "검색"}
        </h1>
      </header>
      {q ? (
        <ArticleGrid articles={articles} emptyText="검색 결과가 없습니다. 다른 검색어를 입력해 보세요." />
      ) : (
        <p className="text-muted-foreground">상단 검색창에 찾고 싶은 상품을 입력하세요.</p>
      )}
    </div>
  );
}

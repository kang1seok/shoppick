import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const revalidate = 3600; // 1시간마다 재생성

interface ArticleRow {
  id: string;
  title: string;
  slug: string;
  meta_description: string;
  published_at: string;
  keywords: {
    keyword: string;
    niches: {
      name: string;
    };
  };
  article_products: {
    products: {
      image_url: string;
    };
  }[];
}

export default async function HomePage() {
  // 최신 글 목록 가져오기 (최대 12개)
  const { data: latestArticlesData } = await supabaseAdmin
    .from("articles")
    .select("id, title, slug, meta_description, published_at, keywords(keyword, niches(name)), article_products(products(image_url))")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(12);

  // 인기 글 목록 가져오기 (daily_performance 기반 조인이 복잡하므로 간단히 최신순으로 대체 또는 랜덤)
  // 실제 구현시엔 pageviews 순으로 가져와야 함.
  const { data: popularArticlesData } = await supabaseAdmin
    .from("articles")
    .select("id, title, slug, meta_description, published_at, keywords(keyword, niches(name)), article_products(products(image_url))")
    .eq("status", "published")
    // .order("pageviews_total", { ascending: false }) // TODO: 뷰 카운트 기반 정렬
    .order("created_at", { ascending: true })
    .limit(6);

  const latestArticles = latestArticlesData as unknown as ArticleRow[];
  const popularArticles = popularArticlesData as unknown as ArticleRow[];

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

      {/* 인기 카테고리 */}
      <section>
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          🔥 인기 쇼핑 가이드
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {popularArticles?.map((article) => (
            <Link href={`/post/${article.slug}`} key={`pop-${article.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer overflow-hidden flex flex-col">
                <div className="relative w-full aspect-square bg-white border-b">
                  <img 
                    src={`/api/og?aspect=square&title=${encodeURIComponent(article.title)}&keyword=${encodeURIComponent(article.keywords?.niches?.name || "추천")}&imageUrl=${encodeURIComponent(article.article_products?.[0]?.products?.image_url || '')}`} 
                    alt={article.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                <CardHeader>
                  <div className="mb-2">
                    <Badge variant="secondary">{article.keywords?.niches?.name || "추천"}</Badge>
                  </div>
                  <CardTitle className="line-clamp-2 leading-tight">{article.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="line-clamp-3">
                    {article.meta_description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
          {!popularArticles?.length && (
            <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/20 rounded-lg">
              아직 발행된 인기 글이 없습니다.
            </div>
          )}
        </div>
      </section>

      {/* 최신 가이드 */}
      <section>
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          ✨ 최신 쇼핑 가이드
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {latestArticles?.map((article) => (
            <Link href={`/post/${article.slug}`} key={`latest-${article.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer overflow-hidden flex flex-col">
                <div className="relative w-full aspect-square bg-white border-b">
                  <img 
                    src={`/api/og?aspect=square&title=${encodeURIComponent(article.title)}&keyword=${encodeURIComponent(article.keywords?.keyword || "키워드")}&imageUrl=${encodeURIComponent(article.article_products?.[0]?.products?.image_url || '')}`} 
                    alt={article.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                <CardHeader>
                  <div className="mb-2 flex items-center justify-between">
                    <Badge variant="outline" className="bg-primary/5">{article.keywords?.keyword || "키워드"}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(article.published_at).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                  <CardTitle className="line-clamp-2 leading-tight text-lg">{article.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="line-clamp-2">
                    {article.meta_description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
          {!latestArticles?.length && (
            <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/20 rounded-lg">
              아직 발행된 최신 글이 없습니다.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

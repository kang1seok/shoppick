import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { ArticleContent } from "@/components/ArticleContent";
import { ProductComparisonTable } from "@/components/ProductComparisonTable";
import { ProductCard } from "@/components/ProductCard";

export const revalidate = 3600;

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

interface ArticleRow {
  id: string;
  title: string;
  meta_description: string | null;
  content_markdown: string;
  published_at: string;
  keywords: { keyword: string } | null;
}

interface ArticleProductRow {
  rank: number;
  reason: string | null;
  products: {
    id: string;
    product_name: string;
    image_url: string;
    product_url: string | null;
    affiliate_links: { deeplink_url: string; created_at: string }[];
    product_snapshots: {
      price: number | null;
      rating: number | null;
      review_count: number | null;
      is_rocket: boolean | null;
      fetched_at: string;
    }[];
  };
}

async function getArticle(slug: string): Promise<ArticleRow | null> {
  const { data } = await supabaseAdmin
    .from("articles")
    .select("id, title, meta_description, content_markdown, published_at, keywords(keyword)")
    .eq("slug", slug)
    .eq("status", "published") // 미발행(draft) 글의 메타데이터 노출 방지
    .maybeSingle();
  return data as unknown as ArticleRow | null;
}

async function getArticleProducts(articleId: string) {
  const { data } = await supabaseAdmin
    .from("article_products")
    .select(`
      rank,
      reason,
      products (
        id,
        product_name,
        image_url,
        product_url,
        affiliate_links (deeplink_url, created_at),
        product_snapshots (price, rating, review_count, is_rocket, fetched_at)
      )
    `)
    .eq("article_id", articleId)
    .order("rank", { ascending: true });

  return ((data || []) as unknown as ArticleProductRow[]).map((ap) => {
    const p = ap.products;
    // 스냅샷은 파이프라인 실행마다 누적되므로 가장 최근 것을 사용
    const snap = [...(p.product_snapshots || [])].sort(
      (a, b) => new Date(b.fetched_at).getTime() - new Date(a.fetched_at).getTime()
    )[0];
    // 딥링크가 없으면 검색 API의 productUrl(파트너스 추적 링크)로 대체
    const link = p.affiliate_links?.[0]?.deeplink_url || p.product_url || "#";

    return {
      rank: ap.rank,
      productId: p.id,
      productName: p.product_name,
      price: snap?.price ?? 0,
      // 0은 "데이터 없음"을 의미했던 과거 데이터이므로 null로 취급
      rating: snap?.rating ? snap.rating : null,
      reviewCount: snap?.review_count ? snap.review_count : null,
      isRocket: snap?.is_rocket ?? false,
      imageUrl: p.image_url,
      deeplinkUrl: link,
      reason: ap.reason,
    };
  });
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const article = await getArticle(decodedSlug);
  if (!article) return { title: "Not Found" };

  const products = await getArticleProducts(article.id);
  const keyword = article.keywords?.keyword || "추천 가이드";
  const imageUrl = products[0]?.imageUrl || "";
  const ogUrl = `/api/og?title=${encodeURIComponent(article.title)}&keyword=${encodeURIComponent(keyword)}&imageUrl=${encodeURIComponent(imageUrl)}`;

  return {
    title: `${article.title} | 산다만다`,
    description: article.meta_description || undefined,
    alternates: { canonical: `/post/${decodedSlug}` },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.meta_description || "",
      publishedTime: article.published_at,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: article.title }],
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const article = await getArticle(decodeURIComponent(slug));
  if (!article) notFound();

  const products = await getArticleProducts(article.id);

  return (
    <article className="max-w-3xl mx-auto py-8">
      {/* 헤더 */}
      <header className="mb-10 text-center space-y-4">
        <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">
          {article.title}
        </h1>
        <div className="flex justify-center items-center gap-4 text-sm text-muted-foreground">
          <span>{new Date(article.published_at).toLocaleDateString("ko-KR")}</span>
          {article.keywords?.keyword && (
            <>
              <span>•</span>
              <span>키워드: {article.keywords.keyword}</span>
            </>
          )}
        </div>
      </header>

      {/* 상품 비교 표 */}
      {products.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">한눈에 보는 TOP {products.length} 비교</h2>
          <ProductComparisonTable articleId={article.id} products={products} />
        </section>
      )}

      {/* AI 본문 (마크다운) */}
      <section className="mb-12">
        <ArticleContent content={article.content_markdown} />
      </section>

      {/* 상세 상품 카드 */}
      {products.length > 0 && (
        <section className="mt-16 border-t pt-12">
          <h2 className="text-2xl font-bold mb-8 text-center">추천 상품 상세 보기</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {products.map((product) => (
              <div key={product.rank} className="relative">
                <div className="absolute -top-4 -left-4 z-10 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold shadow-lg">
                  {product.rank}
                </div>
                <ProductCard articleId={article.id} product={product} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 공지 */}
      <div className="mt-16 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground text-center">
        본 문서의 가격 및 제품 정보는 작성일 기준으로 조회되었으며, 구매 시점의 쿠팡 가격 및 재고 상황과 다를 수 있습니다.<br/>
        해당 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
      </div>
    </article>
  );
}

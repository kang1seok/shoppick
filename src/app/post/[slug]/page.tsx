import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { ArticleContent } from "@/components/ArticleContent";
import { ProductComparisonTable } from "@/components/ProductComparisonTable";
import { ProductCard } from "@/components/ProductCard";

export const revalidate = 3600;

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PostPageProps) {
  const resolvedParams = await params;
  const decodedSlug = decodeURIComponent(resolvedParams.slug);
  const { data: article } = await supabaseAdmin
    .from("articles")
    .select("title, meta_description, keywords(keyword), article_products(products(image_url))")
    .eq("slug", decodedSlug)
    .single();

  if (!article) return { title: "Not Found" };

  const keyword = (article.keywords as any)?.keyword || '추천 가이드';
  const imageUrl = (article.article_products as any)?.[0]?.products?.image_url || '';
  const ogUrl = `/api/og?title=${encodeURIComponent(article.title)}&keyword=${encodeURIComponent(keyword)}&imageUrl=${encodeURIComponent(imageUrl)}`;

  return {
    title: `${article.title} | 산다만다`,
    description: article.meta_description,
    openGraph: {
      title: article.title,
      description: article.meta_description || '',
      images: [
        {
          url: ogUrl,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const resolvedParams = await params;
  const decodedSlug = decodeURIComponent(resolvedParams.slug);
  
  // 1. 글 정보 조회
  const { data: article } = await supabaseAdmin
    .from("articles")
    .select("id, title, content_markdown, published_at, updated_at, keywords(keyword)")
    .eq("slug", decodedSlug)
    .eq("status", "published")
    .single();

  if (!article) {
    notFound();
  }

  // 2. 글에 포함된 상품 목록 조회 (article_products -> products, affiliate_links)
  const { data: articleProducts } = await supabaseAdmin
    .from("article_products")
    .select(`
      rank,
      reason,
      products (
        id,
        product_name,
        image_url,
        affiliate_links (deeplink_url),
        product_snapshots (price, rating, review_count, is_rocket)
      )
    `)
    .eq("article_id", article.id)
    .order("rank", { ascending: true });

  // 3. 데이터 가공
  const products = articleProducts?.map((ap: unknown) => {
    const apData = ap as {
      rank: number;
      reason: string;
      products: {
        id: string;
        product_name: string;
        image_url: string;
        affiliate_links: { deeplink_url: string }[];
        product_snapshots: { price: number; rating: number; review_count: number; is_rocket: boolean }[];
      };
    };
    const p = apData.products;
    const snap = p.product_snapshots?.[0] || {};
    const link = p.affiliate_links?.[0]?.deeplink_url || "#";
    
    return {
      rank: apData.rank,
      productName: p.product_name,
      price: snap.price || 0,
      rating: snap.rating || 0,
      reviewCount: snap.review_count || 0,
      isRocket: snap.is_rocket || false,
      imageUrl: p.image_url,
      deeplinkUrl: link,
      reason: apData.reason,
    };
  }) || [];

  return (
    <article className="max-w-3xl mx-auto py-8">
      {/* 헤더 */}
      <header className="mb-10 text-center space-y-4">
        <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">
          {article.title}
        </h1>
        <div className="flex justify-center items-center gap-4 text-sm text-muted-foreground">
          <span>{new Date(article.published_at).toLocaleDateString("ko-KR")}</span>
          <span>•</span>
          <span>키워드: {(article.keywords as { keyword: string })?.keyword}</span>
        </div>
      </header>

      {/* 상품 비교 표 */}
      {products.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">한눈에 보는 TOP {products.length} 비교</h2>
          <ProductComparisonTable products={products} />
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
                <ProductCard product={product} />
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

import { supabaseAdmin } from "../supabase/server";
import { generateArticle, MODEL } from "../ai/content-generator";
import { generateSlug } from "../utils/slug";
import type { ArticleProduct } from "./product-engine";

export interface Article {
  id: string;
  keyword_id: string;
  title: string;
  slug: string;
  meta_description: string;
  content_markdown: string;
  status: string;
  ai_model: string;
  prompt_version: string;
}

async function generateOne(item: ArticleProduct): Promise<Article | null> {
  const keyword = item.keyword.keyword;
  console.log(`[Content Engine] Generating for keyword: ${keyword}`);

  if (item.products.length === 0) {
    console.warn(`[Content Engine] Skipping ${keyword} due to no products.`);
    return null;
  }

  // AI 생성 호출
  const aiInput = item.products.map((p) => ({
    productId: p.coupang_product_id,
    productName: p.product_name,
    price: p.price,
    rating: p.rating,
    reviewCount: p.review_count,
    isRocket: p.is_rocket,
    imageUrl: p.image_url,
    productUrl: p.product_url,
  }));

  const generated = await generateArticle(keyword, aiInput);

  // Slug 생성 및 중복 체크
  let slug = generateSlug(generated.title);
  const { data: existingSlug } = await supabaseAdmin
    .from("articles")
    .select("id")
    .eq("slug", slug)
    .limit(1);

  if (existingSlug && existingSlug.length > 0) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }

  // 기본은 검수 대기(draft). AUTO_PUBLISH=true일 때만 즉시 발행 (GEMINI.md: 초기 발행은 수동 검수)
  const autoPublish = process.env.AUTO_PUBLISH === "true";

  // DB 저장 (articles)
  const { data: article, error: articleError } = await supabaseAdmin
    .from("articles")
    .insert({
      keyword_id: item.keyword.id,
      title: generated.title,
      slug,
      meta_description: generated.meta_description,
      content_markdown: generated.content_markdown,
      status: autoPublish ? "published" : "draft",
      ai_model: MODEL,
      prompt_version: generated.prompt_version,
      published_at: autoPublish ? new Date().toISOString() : null,
    })
    .select("*")
    .single();

  if (articleError || !article) throw articleError ?? new Error("Article insert returned no row");

  // DB 저장 (article_products)
  const articleProductsToInsert = item.products.map((p) => ({
    article_id: article.id,
    product_id: p.product_id,
    rank: p.rank,
    reason: "", // AI가 생성한 마크다운 안에 포함되므로 여기선 생략
  }));

  const { error: apError } = await supabaseAdmin
    .from("article_products")
    .insert(articleProductsToInsert);

  if (apError) {
    // 상품 없는 글이 남지 않도록 롤백 (키워드는 selected로 남아 다음 실행에서 재시도)
    await supabaseAdmin.from("articles").delete().eq("id", article.id);
    throw apError;
  }

  // 키워드 상태를 "used"로 변경하여 다음 파이프라인 실행 시 다시 선택되지 않도록 방지
  const { error: kwUpdateError } = await supabaseAdmin
    .from("keywords")
    .update({ status: "used" })
    .eq("id", item.keyword.id);

  if (kwUpdateError) {
    console.error(`[Content Engine] Failed to update keyword status to used:`, kwUpdateError);
  }

  console.log(`[Content Engine] Successfully created article [${article.status}]: ${article.title} (slug: ${slug})`);
  return article as Article;
}

export async function generateArticles(data: ArticleProduct[]): Promise<Article[]> {
  console.log(`[Content Engine] Starting article generation for ${data.length} items.`);

  // 키워드별 생성은 서로 독립적이므로 병렬 처리 (Vercel 함수 타임아웃 대응)
  const results = await Promise.allSettled(data.map(generateOne));

  const generatedArticles: Article[] = [];
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      if (result.value) generatedArticles.push(result.value);
    } else {
      console.error(`[Content Engine] Error generating article for ${data[i].keyword.keyword}:`, result.reason);
    }
  });

  console.log(`[Content Engine] Finished generation. Created ${generatedArticles.length} articles.`);
  return generatedArticles;
}

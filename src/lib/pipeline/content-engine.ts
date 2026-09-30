import { supabaseAdmin } from "../supabase/server";
import { generateArticle } from "../ai/content-generator";
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

export async function generateArticles(data: ArticleProduct[]): Promise<Article[]> {
  console.log(`[Content Engine] Starting article generation for ${data.length} items.`);
  const generatedArticles: Article[] = [];

  for (const item of data) {
    try {
      console.log(`[Content Engine] Generating for keyword: ${item.keyword.keyword}`);
      
      if (item.products.length === 0) {
        console.warn(`[Content Engine] Skipping ${item.keyword.keyword} due to no products.`);
        continue;
      }

      // AI 생성 호출
      const aiInput = item.products.map(p => ({
        productId: p.coupang_product_id,
        productName: p.product_name,
        price: p.price,
        rating: p.rating,
        reviewCount: p.review_count,
        isRocket: p.is_rocket,
        imageUrl: p.image_url,
        productUrl: p.product_url,
      }));

      const generated = await generateArticle(item.keyword.keyword, aiInput);

      // Slug 생성
      let slug = generateSlug(generated.title);
      
      // Slug 중복 체크
      const { data: existingSlug } = await supabaseAdmin
        .from("articles")
        .select("id")
        .eq("slug", slug)
        .limit(1);
        
      if (existingSlug && existingSlug.length > 0) {
        slug = `${slug}-${Date.now().toString().slice(-4)}`;
      }

      // DB 저장 (articles)
      const { data: article, error: articleError } = await supabaseAdmin
        .from("articles")
        .insert({
          keyword_id: item.keyword.id,
          title: generated.title,
          slug,
          meta_description: generated.meta_description,
          content_markdown: generated.content_markdown,
          status: "published",
          ai_model: "gpt-4o",
          prompt_version: generated.prompt_version,
          published_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (articleError) throw articleError;

      // DB 저장 (article_products)
      const articleProductsToInsert = item.products.map(p => ({
        article_id: article.id,
        product_id: p.product_id,
        rank: p.rank,
        reason: "", // AI가 생성한 마크다운 안에 포함되므로 여기선 생략 또는 추후 분리 가능
      }));

      const { error: apError } = await supabaseAdmin
        .from("article_products")
        .insert(articleProductsToInsert);

      if (apError) throw apError;

      // 키워드 상태를 "used"로 변경하여 다음 파이프라인 실행 시 다시 선택되지 않도록 방지
      const { error: kwUpdateError } = await supabaseAdmin
        .from("keywords")
        .update({ status: "used" })
        .eq("id", item.keyword.id);

      if (kwUpdateError) {
        console.error(`[Content Engine] Failed to update keyword status to used:`, kwUpdateError);
      }

      console.log(`[Content Engine] Successfully created draft article: ${article.title} (slug: ${slug})`);
      generatedArticles.push(article);

    } catch (error) {
      console.error(`[Content Engine] Error generating article for ${item.keyword.keyword}:`, error);
    }
  }

  console.log(`[Content Engine] Finished generation. Created ${generatedArticles.length} draft articles.`);
  return generatedArticles;
}

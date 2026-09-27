import { supabaseAdmin } from "../supabase/server";
import { searchProducts, ProductSearchResult } from "../coupang/search";
import { generateDeeplink } from "../coupang/deeplink";
import type { Keyword } from "./keyword-engine";

export interface ArticleProduct {
  keyword: Keyword;
  products: {
    product_id: string; // our DB uuid
    coupang_product_id: string;
    product_name: string;
    price: number;
    rating: number;
    review_count: number;
    is_rocket: boolean;
    image_url: string;
    product_url: string;
    deeplink_url: string;
    rank: number;
    score: number;
  }[];
}

function calculateProductScore(p: ProductSearchResult, keyword: string): number {
  let rating_score = 25;
  if (p.rating >= 4.0) rating_score = 100;
  else if (p.rating >= 3.5) rating_score = 75;
  else if (p.rating >= 3.0) rating_score = 50;

  let review_count_score = 20;
  if (p.reviewCount >= 1000) review_count_score = 100;
  else if (p.reviewCount >= 500) review_count_score = 80;
  else if (p.reviewCount >= 100) review_count_score = 60;
  else if (p.reviewCount >= 50) review_count_score = 40;

  // 기본 가격 점수
  const price_score = 100; 

  const is_rocket_score = p.isRocket ? 100 : 50;
  
  // 키워드가 상품명에 포함되어 있으면 가점
  const relevance_score = p.productName.includes(keyword) ? 100 : 50;
  
  const commission_score = 100; // 쿠팡 기본 수수료 3% 가정

  return (
    rating_score * 0.25 +
    review_count_score * 0.20 +
    price_score * 0.15 +
    is_rocket_score * 0.15 +
    relevance_score * 0.15 +
    commission_score * 0.10
  );
}

export async function searchAndScoreProducts(keywords: Keyword[]): Promise<ArticleProduct[]> {
  console.log(`[Product Engine] Starting product search for ${keywords.length} keywords.`);
  const results: ArticleProduct[] = [];

  for (const kw of keywords) {
    try {
      console.log(`[Product Engine] Searching for keyword: ${kw.keyword}`);
      const searchResults = await searchProducts(kw.keyword, { limit: 10 });
      
      if (searchResults.length === 0) {
        console.warn(`[Product Engine] No products found for ${kw.keyword}`);
        continue;
      }

      // 중복 제거 및 스코어링
      const uniqueProducts = new Map();
      for (const p of searchResults) {
        if (!uniqueProducts.has(p.productId)) {
          uniqueProducts.set(p.productId, p);
        }
      }

      const scored = Array.from(uniqueProducts.values()).map((p) => ({
        ...p,
        score: calculateProductScore(p, kw.keyword),
      })).sort((a, b) => b.score - a.score);

      // 상위 5개 선정
      const top5 = scored.slice(0, 5);
      
      const articleProductInfo: ArticleProduct = {
        keyword: kw,
        products: [],
      };

      let rank = 1;
      for (const p of top5) {
        // 1. products 테이블에 저장 (upsert 방식을 흉내내기 위해 먼저 조회)
        let dbProductId: string;
        
        const { data: existingProduct } = await supabaseAdmin
          .from("products")
          .select("id")
          .eq("coupang_product_id", p.productId)
          .single();

        if (existingProduct) {
          dbProductId = existingProduct.id;
        } else {
          const { data: newProduct, error } = await supabaseAdmin
            .from("products")
            .insert({
              coupang_product_id: p.productId,
              product_name: p.productName,
              product_url: p.productUrl,
              image_url: p.imageUrl,
              // category_name, brand 등은 현재 API 결과에 없으므로 생략
            })
            .select("id")
            .single();
            
          if (error) throw error;
          dbProductId = newProduct.id;
        }

        // 2. affiliate_links 확인 및 생성
        let deeplinkUrl = p.productUrl; // 기본값
        const { data: existingLink } = await supabaseAdmin
          .from("affiliate_links")
          .select("deeplink_url")
          .eq("product_id", dbProductId)
          .single();

        if (existingLink) {
          deeplinkUrl = existingLink.deeplink_url;
        } else {
          try {
            // 딥링크 생성 호출 (subId로 키워드 전달 가능)
            const subId = kw.keyword.slice(0, 20).replace(/\s+/g, '_'); // 공백을 밑줄로 치환
            deeplinkUrl = await generateDeeplink(p.productUrl, subId);
            
            await supabaseAdmin.from("affiliate_links").insert({
              product_id: dbProductId,
              original_url: p.productUrl,
              deeplink_url: deeplinkUrl,
              sub_id: subId,
            });
          } catch (e) {
            console.warn(`[Product Engine] Failed to generate deeplink for ${p.productId}`, e);
          }
        }
        
        // 3. 상품 스냅샷 저장
        await supabaseAdmin.from("product_snapshots").insert({
          product_id: dbProductId,
          price: p.price,
          rating: p.rating,
          review_count: p.reviewCount,
          is_rocket: p.isRocket,
        });

        articleProductInfo.products.push({
          product_id: dbProductId,
          coupang_product_id: p.productId,
          product_name: p.productName,
          price: p.price,
          rating: p.rating,
          review_count: p.reviewCount,
          is_rocket: p.isRocket,
          image_url: p.imageUrl,
          product_url: p.productUrl,
          deeplink_url: deeplinkUrl,
          rank: rank++,
          score: p.score,
        });
      }
      
      results.push(articleProductInfo);

    } catch (error) {
      console.error(`[Product Engine] Error processing keyword ${kw.keyword}:`, error);
    }
  }

  console.log(`[Product Engine] Finished processing. Generated product sets for ${results.length} keywords.`);
  return results;
}

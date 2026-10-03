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
    rating: number | null;
    review_count: number | null;
    is_rocket: boolean;
    image_url: string;
    product_url: string;
    deeplink_url: string;
    rank: number;
    score: number;
  }[];
}

// 쿠팡 검색 정확도를 떨어뜨리는 구매 의도 수식어 (검색어/관련도 계산에서 제외)
const MODIFIER_PATTERN = /추천|순위|비교|가성비|내돈내산/g;

export function toSearchKeyword(keyword: string): string {
  return keyword.replace(MODIFIER_PATTERN, "").replace(/\s+/g, " ").trim();
}

// 검색어 토큰 중 상품명에 포함된 비율 (공백/대소문자 무시)
function calculateRelevance(productName: string, searchKeyword: string): number {
  const name = productName.toLowerCase().replace(/\s+/g, "");
  const tokens = searchKeyword.toLowerCase().split(" ").filter(Boolean);
  if (tokens.length === 0) return 50;
  const matched = tokens.filter((t) => name.includes(t)).length;
  return 50 + 50 * (matched / tokens.length);
}

function calculateProductScore(p: ProductSearchResult, searchKeyword: string): number {
  // [점수, 가중치] — 값이 없는 항목(null)은 제외하고 나머지 가중치로 재정규화
  const components: [number | null, number][] = [];

  let rating_score: number | null = null;
  if (p.rating !== null) {
    rating_score = 25;
    if (p.rating >= 4.0) rating_score = 100;
    else if (p.rating >= 3.5) rating_score = 75;
    else if (p.rating >= 3.0) rating_score = 50;
  }
  components.push([rating_score, 0.25]);

  let review_count_score: number | null = null;
  if (p.reviewCount !== null) {
    review_count_score = 20;
    if (p.reviewCount >= 1000) review_count_score = 100;
    else if (p.reviewCount >= 500) review_count_score = 80;
    else if (p.reviewCount >= 100) review_count_score = 60;
    else if (p.reviewCount >= 50) review_count_score = 40;
  }
  components.push([review_count_score, 0.20]);

  components.push([p.isRocket ? 100 : 50, 0.15]);
  components.push([calculateRelevance(p.productName, searchKeyword), 0.15]);
  // 가격/수수료 점수는 아직 차별화 데이터가 없어 상수 (순위에 영향 없음)
  components.push([100, 0.15]);
  components.push([100, 0.10]);

  let total = 0;
  let weightSum = 0;
  for (const [score, weight] of components) {
    if (score === null) continue;
    total += score * weight;
    weightSum += weight;
  }
  return weightSum > 0 ? total / weightSum : 0;
}

export async function searchAndScoreProducts(keywords: Keyword[]): Promise<ArticleProduct[]> {
  console.log(`[Product Engine] Starting product search for ${keywords.length} keywords.`);
  const results: ArticleProduct[] = [];

  for (const kw of keywords) {
    try {
      console.log(`[Product Engine] Searching for keyword: ${kw.keyword}`);
      
      // 쿠팡 검색의 정확도를 높이기 위해 불필요한 수식어 제거
      const searchKeyword = toSearchKeyword(kw.keyword) || kw.keyword;
      
      const searchResults = await searchProducts(searchKeyword, { limit: 10 });
      
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
        score: calculateProductScore(p, searchKeyword),
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
            // 딥링크 생성 (subId는 쿠팡파트너스에 등록한 영문/숫자 채널 ID만 사용 — 한글 키워드는 실패 원인이 됨)
            const subId = process.env.COUPANG_SUB_ID || undefined;
            deeplinkUrl = await generateDeeplink(p.productUrl, subId);

            await supabaseAdmin.from("affiliate_links").insert({
              product_id: dbProductId,
              original_url: p.productUrl,
              deeplink_url: deeplinkUrl,
              sub_id: subId ?? null,
            });
          } catch (e) {
            // 검색 API의 productUrl도 파트너스 추적 링크이므로 수익 손실 없이 그대로 사용
            console.warn(`[Product Engine] Failed to generate deeplink for ${p.productId}, falling back to productUrl`, e);
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

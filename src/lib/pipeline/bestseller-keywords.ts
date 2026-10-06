import { getBestProducts } from "../coupang/best";
import { callOpenAI } from "../ai/content-generator";

// 쿠팡 카테고리 ID → 사이트 niche. scope는 AI가 해당 niche에 맞는 품목만 고르도록 하는 범위 설명
// (가전디지털 베스트 하나에서 디지털/생활가전 두 niche를 각각 뽑음)
const CATEGORY_TO_NICHE: { categoryId: number; nicheSlug: string; scope: string }[] = [
  { categoryId: 1013, nicheSlug: "kitchen", scope: "주방가전·조리가전 (에어프라이어, 커피머신, 전기포트, 믹서기 등)" },
  // 주방이 먼저: 같은 품목이 겹치면 먼저 등록된 niche로 분류됨
  { categoryId: 1016, nicheSlug: "digital", scope: "컴퓨터·모바일·오디오·IT 기기 (노트북, 이어폰, 모니터, 키보드 등)" },
  { categoryId: 1016, nicheSlug: "home-appliances", scope: "생활가전 (청소기, 공기청정기, 가습기, 히터, 드라이어, 세탁·건조 가전 등)" },
];

export interface DiscoveredKeyword {
  keyword: string;
  nicheSlug: string;
}

/**
 * 쿠팡 베스트 상품명에서 "추천 글감이 될 일반 품목명"을 AI로 추출
 * (브랜드/모델명/수량이 섞인 상품명 → "전기주전자 추천" 같은 검색형 키워드)
 */
async function extractKeywords(productNames: string[], existing: string[], scope: string): Promise<string[]> {
  const prompt = `다음은 쿠팡 베스트셀러 상품명입니다.
이 상품들이 속한 "일반 품목"을 기준으로, 블로그 쇼핑 가이드 글감이 될 검색 키워드를 최대 8개 만드세요.

규칙:
- 브랜드명, 모델명, 수량, 용량은 제거하고 품목명만 사용 (예: "키친아트 솔리드 전기주전자" → "전기주전자 추천")
- 각 키워드는 "품목명 추천" 형태로 끝낼 것
- 소모품(필터, 케이블 등)보다 비교 구매할 만한 제품 위주
- 반드시 다음 범위의 품목만 선택: ${scope}
- 범위에 맞는 품목이 없으면 빈 배열을 반환
- 아래 "이미 있는 키워드"와 같은 품목은 제외
- JSON 객체로만 응답: {"keywords": ["...", "..."]}

이미 있는 키워드: ${existing.slice(0, 80).join(", ")}

상품명:
${productNames.map((n, i) => `${i + 1}. ${n}`).join("\n")}`;

  const raw = await callOpenAI(
    [
      { role: "system", content: "You extract generic shopping-guide keywords. Respond only with a JSON object." },
      { role: "user", content: prompt },
    ],
    { json: true }
  );

  const parsed = JSON.parse(raw) as { keywords?: unknown };
  if (!Array.isArray(parsed.keywords)) return [];
  return parsed.keywords
    .filter((k): k is string => typeof k === "string")
    .map((k) => k.trim())
    .filter((k) => k.length >= 4 && k.length <= 30);
}

/**
 * 쿠팡 베스트셀러 기반 신규 키워드 발굴. 카테고리별로 독립 실행하며 실패한 카테고리는 건너뜀.
 */
export async function discoverBestsellerKeywords(existingKeywords: string[]): Promise<DiscoveredKeyword[]> {
  const results = await Promise.allSettled(
    CATEGORY_TO_NICHE.map(async ({ categoryId, nicheSlug, scope }) => {
      const best = await getBestProducts(categoryId, 50);
      if (best.length === 0) return [];
      const keywords = await extractKeywords(best.map((p) => p.productName), existingKeywords, scope);
      return keywords.map((keyword) => ({ keyword, nicheSlug }));
    })
  );

  const discovered: DiscoveredKeyword[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") discovered.push(...r.value);
    else console.error(`[Bestseller Keywords] ${CATEGORY_TO_NICHE[i].nicheSlug} (category ${CATEGORY_TO_NICHE[i].categoryId}) failed:`, r.reason);
  });
  console.log(`[Bestseller Keywords] Discovered ${discovered.length} keywords`);
  return discovered;
}

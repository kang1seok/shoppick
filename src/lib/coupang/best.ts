import { fetchCoupangApi } from "./client";

export interface BestProduct {
  productId: number;
  productName: string;
  categoryName: string;
  rank: number;
}

interface BestCategoryResponse {
  rCode: string;
  rMessage: string;
  data: BestProduct[];
}

/**
 * 쿠팡 카테고리별 베스트 상품 조회 (지금 실제로 잘 팔리는 품목 파악용)
 * 1016 가전디지털 / 1013 주방용품 / 1014 생활용품 등
 */
export async function getBestProducts(categoryId: number, limit: number = 50): Promise<BestProduct[]> {
  const endpoint = `/v2/providers/affiliate_open_api/apis/openapi/v1/products/bestcategories/${categoryId}?limit=${limit}`;
  const response = await fetchCoupangApi<BestCategoryResponse>("GET", endpoint);
  return response.data ?? [];
}

import { fetchCoupangApi } from "./client";

export interface CoupangProduct {
  productId: string;
  productName: string;
  productPrice: number;
  productImage: string;
  productUrl: string;
  isRocket: boolean;
  isFreeShipping: boolean;
  categoryName: string;
}

export interface ProductSearchResponse {
  rCode: string;
  rMessage: string;
  data: {
    productData: CoupangProduct[];
  };
}

export interface ProductSearchResult {
  productId: string;
  productName: string;
  price: number;
  imageUrl: string;
  productUrl: string;
  rating: number;      // Note: search API doesn't always provide rating/review count directly.
  reviewCount: number; // We'll mock or set default if not available from basic search
  isRocket: boolean;
}

/**
 * 상품 검색 API
 */
export async function searchProducts(
  keyword: string, 
  options?: { limit?: number; sortBy?: string }
): Promise<ProductSearchResult[]> {
  const limit = options?.limit || 10;
  const endpoint = `/v2/providers/affiliate_open_api/apis/openapi/products/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`;

  const response = await fetchCoupangApi<ProductSearchResponse>("GET", endpoint);

  if (!response.data || !response.data.productData) {
    return [];
  }

  return response.data.productData.map((item) => ({
    productId: item.productId,
    productName: item.productName,
    price: item.productPrice,
    imageUrl: item.productImage,
    productUrl: item.productUrl,
    // 실제 쿠팡 파트너스 API 상품 검색 응답에 rating, reviewCount가 없을 수 있으므로 임시 0 처리
    rating: 0,
    reviewCount: 0,
    isRocket: item.isRocket,
  }));
}

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
  rating: number | null;      // null = not provided by the search API (unknown, not zero)
  reviewCount: number | null;
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
    // 쿠팡 파트너스 상품 검색 API는 평점/리뷰 수를 제공하지 않음 → 0이 아닌 "알 수 없음"(null)으로 처리
    rating: null,
    reviewCount: null,
    isRocket: item.isRocket,
  }));
}

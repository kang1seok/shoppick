import { fetchCoupangApi } from "./client";

export interface DeeplinkRequest {
  coupangUrls: string[];
  subId?: string;
}

export interface DeeplinkResponse {
  rCode: string;
  rMessage: string;
  data: {
    originalUrl: string;
    shortenUrl: string;
  }[];
}

/**
 * 딥링크(제휴 링크) 생성 API
 * 원본 쿠팡 URL을 파트너스 수익 링크(shortenUrl)로 변환
 */
export async function generateDeeplink(coupangUrl: string, subId?: string): Promise<string> {
  const endpoint = `/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink`;

  const body: DeeplinkRequest = {
    coupangUrls: [coupangUrl],
  };

  if (subId) {
    body.subId = subId;
  }

  // POST 요청
  const response = await fetchCoupangApi<DeeplinkResponse>("POST", endpoint, body);

  if (response.data && response.data.length > 0) {
    return response.data[0].shortenUrl;
  }

  throw new Error("Failed to generate deeplink from Coupang API.");
}

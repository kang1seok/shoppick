import { fetchCoupangApi } from "./client";

export interface DailyReportResponse {
  rCode: string;
  rMessage: string;
  data: {
    clicks: number;
    orders: number;
    commission: number;
  }[];
}

/**
 * 일별 실적 조회 API
 * @param date YYYYMMDD 형태의 날짜 문자열
 */
export async function getDailyReport(date: string) {
  // 쿠팡파트너스 실적 리포트 엔드포인트
  // 문서에 따라 /v2/providers/affiliate_open_api/apis/openapi/v1/reports 등일 수 있으나
  // 프롬프트 요구사항에 맞춤
  const endpoint = `/v2/providers/affiliate_open_api/apis/openapi/v1/reports?date=${date}`;

  const response = await fetchCoupangApi<DailyReportResponse>("GET", endpoint);

  if (response.data && response.data.length > 0) {
    return response.data[0];
  }

  return {
    clicks: 0,
    orders: 0,
    commission: 0,
  };
}

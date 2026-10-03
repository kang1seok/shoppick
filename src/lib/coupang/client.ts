import crypto from "crypto";

const COUPANG_ACCESS_KEY = process.env.COUPANG_ACCESS_KEY!;
const COUPANG_SECRET_KEY = process.env.COUPANG_SECRET_KEY!;

/**
 * 쿠팡 API 서명(HMAC-SHA256) 생성
 */
export function generateCoupangHmac(method: string, url: string): { authorization: string, timestamp: string } {
  const [path, query = ''] = url.replace(/^https?:\/\/[^\/]+/, "").split('?');
  
  // yymmdd'T'HHMMSS'Z'
  const datetime = new Date().toISOString().substring(2, 19).replace(/-/g, "").replace(/:/g, "") + "Z";
  
  // message = datetime + method + path + query (NO question mark!)
  const message = datetime + method + path + query;

  const signature = crypto
    .createHmac("sha256", COUPANG_SECRET_KEY)
    .update(message)
    .digest("hex");

  const authorization = `CEA algorithm=HmacSHA256, access-key=${COUPANG_ACCESS_KEY}, signed-date=${datetime}, signature=${signature}`;

  return { authorization, timestamp: datetime };
}

/**
 * 공통 쿠팡 API 요청 함수
 */
export async function fetchCoupangApi<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
  const url = `https://api-gateway.coupang.com${endpoint}`;
  
  // 실패 시 최대 3회 재시도 로직
  const MAX_RETRIES = 3;
  let attempt = 0;
  
  while (attempt < MAX_RETRIES) {
    try {
      const { authorization } = generateCoupangHmac(method, endpoint);
      
      const headers: Record<string, string> = {
        Authorization: authorization,
        "Content-Type": "application/json",
      };

      console.log(`[Coupang API] Requesting ${method} ${endpoint} (Attempt: ${attempt + 1})`);
      
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        const err = new Error(`Coupang API Error: ${response.status} ${response.statusText} - ${errorText}`);
        // 4xx(429 제외)는 재시도해도 같은 결과 → 호출 한도만 소모하므로 즉시 실패
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw Object.assign(err, { noRetry: true });
        }
        throw err;
      }

      const data = await response.json();
      console.log(`[Coupang API] Success: ${method} ${endpoint}`);
      return data as T;
    } catch (error) {
      attempt++;
      console.error(`[Coupang API] Error on attempt ${attempt}:`, error);

      const noRetry = error instanceof Error && (error as Error & { noRetry?: boolean }).noRetry;
      if (noRetry || attempt >= MAX_RETRIES) {
        throw new Error(
          `Failed to fetch Coupang API after ${attempt} attempt(s): ${error instanceof Error ? error.message : String(error)}`
        );
      }
      
      // 5초 대기 후 재시도
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
  
  throw new Error("Unexpected error in fetchCoupangApi");
}

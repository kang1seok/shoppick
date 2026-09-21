const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID!;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET!;

export async function fetchNaverApi<T>(endpoint: string, method: string = "GET", body?: unknown): Promise<T> {
  // 2026.07 이후 신규 발급 키는 NAVER API HUB(NCP)를 사용해야 함
  const url = `https://naverapihub.apigw.ntruss.com${endpoint}`;

  const headers: Record<string, string> = {
    "X-NCP-APIGW-API-KEY-ID": NAVER_CLIENT_ID,
    "X-NCP-APIGW-API-KEY": NAVER_CLIENT_SECRET,
    "Content-Type": "application/json",
  };

  try {
    console.log(`[Naver API] Requesting ${method} ${endpoint}`);
    
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Naver API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`[Naver API] Success: ${method} ${endpoint}`);
    return data as T;
  } catch (error) {
    console.error(`[Naver API] Error:`, error);
    throw error;
  }
}

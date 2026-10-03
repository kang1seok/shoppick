/**
 * 네이버 연관 검색어 수집 (웹 스크래핑 기반)
 * 주의: 공식 API가 아니므로 구조 변경 시 에러가 발생할 수 있습니다.
 */
export async function getRelatedKeywords(keyword: string): Promise<string[]> {
  try {
    console.log(`[Naver Keywords] Scraping related keywords for: ${keyword}`);
    
    // 네이버 자동완성(Autocomplete) API 활용 (HTML 파싱보다 훨씬 안정적)
    const url = `https://ac.search.naver.com/nx/ac?q=${encodeURIComponent(keyword)}&con=1&frm=nv&ans=2&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&run=2&rev=4&q_enc=UTF-8&st=100`;
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    const relatedKeywords: string[] = [];

    // JSON 응답 구조: data.items[0] 배열 안에 추천 검색어 배열들이 들어있음
    if (data.items && data.items[0]) {
      (data.items[0] as string[][]).forEach((item) => {
        const kw = item[0];
        if (kw && !relatedKeywords.includes(kw) && kw !== keyword) {
          relatedKeywords.push(kw);
        }
      });
    }

    console.log(`[Naver Keywords] Found ${relatedKeywords.length} related keywords`);
    return relatedKeywords.slice(0, 10);
  } catch (error) {
    console.error(`[Naver Keywords] Failed to fetch related keywords:`, error);
    return [];
  }
}

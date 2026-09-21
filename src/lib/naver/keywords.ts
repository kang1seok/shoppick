/**
 * 네이버 연관 검색어 수집 (웹 스크래핑 기반)
 * 주의: 공식 API가 아니므로 구조 변경 시 에러가 발생할 수 있습니다.
 */
export async function getRelatedKeywords(keyword: string): Promise<string[]> {
  try {
    console.log(`[Naver Keywords] Scraping related keywords for: ${keyword}`);
    
    // 네이버 모바일 통합 검색 페이지 활용 (연관 검색어가 JSON 형태로 파싱하기 쉬운 경우가 많음)
    // 혹은 PC 버전 페이지 요청
    const url = `https://search.naver.com/search.naver?query=${encodeURIComponent(keyword)}`;
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const html = await response.text();
    
    // 연관검색어 추출 (현재 네이버 HTML 구조 기준: <div class="tit">키워드</div> 형태 등)
    // 정규식이나 cheerio 등을 사용해야 하지만, 간단히 정규식으로 시도.
    // data-area="*q" 또는 class="tit" 안의 텍스트 등을 파싱
    // 주의: 정확한 파싱을 위해서는 cheerio 등 라이브러리 추가가 좋으나 의존성 추가 없이 정규식 사용
    
    const relatedKeywords: string[] = [];
    const regex = /<div class="tit">([^<]+)<\/div>/g;
    let match;
    
    // 이 정규식은 네이버의 특정 UI(예: 연관검색어 영역)의 class를 가정함
    // 너무 많은 노이즈가 들어갈 수 있으므로, 연관검색어 리스트 DOM 영역만 잡는 등 정교화 필요
    // 여기서는 기본 템플릿만 제공
    
    while ((match = regex.exec(html)) !== null) {
      const kw = match[1].trim();
      if (kw && !relatedKeywords.includes(kw) && kw !== keyword) {
        relatedKeywords.push(kw);
      }
    }
    
    console.log(`[Naver Keywords] Found ${relatedKeywords.length} related keywords`);
    return relatedKeywords.slice(0, 10);
  } catch (error) {
    console.error(`[Naver Keywords] Failed to fetch related keywords:`, error);
    return [];
  }
}

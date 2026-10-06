// 구매와 무관한 자동완성 결과(중고/수리/사용법 등)는 글감으로 부적합
const NOISE_PATTERN = /중고|렌탈|대여|수리|서비스센터|a\/s|고장|매뉴얼|설명서|사용법|사용방법|분해|청소방법|뜻|만들기|diy|직구|당근|리퍼/i;

// 접미사를 붙여 조회하면 같은 키워드에서 훨씬 다양한 후보를 얻을 수 있음
const SUFFIXES = ["", " 추천", " 비교", " 가성비", " 순위"];

async function fetchAutocomplete(query: string): Promise<string[]> {
  const url = `https://ac.search.naver.com/nx/ac?q=${encodeURIComponent(query)}&con=1&frm=nv&ans=2&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&run=2&rev=4&q_enc=UTF-8&st=100`;

  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

  const data = (await response.json()) as { items?: string[][][] };
  // JSON 응답 구조: items[0] 배열 안에 [추천어, ...] 배열들이 들어있음
  return (data.items?.[0] ?? []).map((item) => item[0]).filter((kw): kw is string => Boolean(kw));
}

/**
 * 네이버 자동완성 기반 연관 키워드 수집 (공식 API가 아니므로 구조 변경 시 빈 배열 반환)
 * 접미사(추천/비교/가성비/순위)를 붙여 여러 번 조회하고, 구매와 무관한 결과는 제외
 */
export async function getRelatedKeywords(keyword: string): Promise<string[]> {
  console.log(`[Naver Keywords] Fetching related keywords for: ${keyword}`);

  const results = await Promise.allSettled(SUFFIXES.map((s) => fetchAutocomplete(`${keyword}${s}`)));

  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length === results.length) {
    console.error(`[Naver Keywords] All autocomplete requests failed for "${keyword}":`, (failures[0] as PromiseRejectedResult).reason);
    return [];
  }

  const base = keyword.replace(/\s+/g, "");
  const seen = new Set<string>();
  const related: string[] = [];

  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const raw of r.value) {
      const kw = raw.trim();
      const key = kw.replace(/\s+/g, "");
      if (!kw || key === base || seen.has(key) || NOISE_PATTERN.test(kw)) continue;
      seen.add(key);
      related.push(kw);
    }
  }

  console.log(`[Naver Keywords] Found ${related.length} related keywords for "${keyword}"`);
  return related.slice(0, 20);
}

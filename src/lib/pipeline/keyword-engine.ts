import { supabaseAdmin } from "../supabase/server";
import { getRelatedKeywords } from "../naver/keywords";
import { getSearchTrends } from "../naver/datalab";

export interface Keyword {
  id: string;
  niche_id: string;
  keyword: string;
  source: string;
  search_volume: number;
  trend_score: number;
  competition_score: number;
  purchase_intent_score: number;
  final_score: number;
  status: string;
  last_checked_at?: string;
}

function calculatePurchaseIntent(keyword: string): number {
  const intentWords = ["추천", "비교", "가격", "순위", "후기", "리뷰"];
  let score = 50;
  for (const word of intentWords) {
    if (keyword.includes(word)) {
      score += 20;
    }
  }
  return Math.min(score, 100);
}

function calculateSeasonality(): number {
  // 간단한 시즌 스코어 (데이터가 없으므로 기본 50)
  // 향후 겨울/여름 키워드 매칭 로직 추가 가능
  return 50; 
}

export async function selectDailyKeywords(): Promise<Keyword[]> {
  console.log(`[Keyword Engine] Starting daily keyword selection...`);

  try {
    // 1. seed 키워드 조회
    const { data: seedKeywords, error: seedError } = await supabaseAdmin
      .from("keywords")
      .select("*")
      .in("status", ["pending", "selected"])
      .eq("source", "seed");

    if (seedError) throw seedError;
    if (!seedKeywords || seedKeywords.length === 0) {
      console.log(`[Keyword Engine] No seed keywords found.`);
      return [];
    }

    const allKeywordsToScore: Keyword[] = [...seedKeywords];

    // 2. 연관 검색어 수집 및 저장
    for (const seed of seedKeywords) {
      const related = await getRelatedKeywords(seed.keyword);
      if (related.length > 0) {
        const insertData = related.map((kw) => ({
          niche_id: seed.niche_id,
          keyword: kw,
          source: "related",
          status: "pending",
        }));
        
        // 중복 방지를 위해 에러 무시 (keyword가 테이블에 UNIQUE 제약이 있다면, 
        // 하지만 schema 상 unique 제약이 없으므로 중복 체크 필요)
        for (const item of insertData) {
          // 이미 존재하는지 확인
          const { data: existing } = await supabaseAdmin
            .from("keywords")
            .select("id")
            .eq("keyword", item.keyword)
            .limit(1);
            
          if (!existing || existing.length === 0) {
            const { data: inserted } = await supabaseAdmin
              .from("keywords")
              .insert(item)
              .select("*")
              .single();
              
            if (inserted) allKeywordsToScore.push(inserted);
          }
        }
      }
    }

    console.log(`[Keyword Engine] Total keywords to score: ${allKeywordsToScore.length}`);

    // 3. 점수화 로직 실행
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    
    // 네이버 DataLab API 호출 최적화를 위해 5개씩 그룹화
    const scoredKeywords = [];
    for (let i = 0; i < allKeywordsToScore.length; i += 5) {
      const chunk = allKeywordsToScore.slice(i, i + 5);
      const kwNames = chunk.map((k) => k.keyword);
      
      const trends = await getSearchTrends(kwNames, startDate, endDate);
      
      for (const kw of chunk) {
        const trendData = trends.find((t) => t.keyword === kw.keyword);
        
        const search_volume_score = trendData ? trendData.ratio : 50; // ratio (0~100)
        let trend_score = 50;
        if (trendData?.trend === "up") trend_score = 100;
        else if (trendData?.trend === "down") trend_score = 25;
        
        const competition_score = 50; // 경쟁도 (API로 정확한 파악 어려움)
        const purchase_intent_score = calculatePurchaseIntent(kw.keyword);
        const seasonality_score = calculateSeasonality();
        
        const final_score = (
          search_volume_score * 0.30 +
          trend_score * 0.20 +
          competition_score * 0.20 +
          purchase_intent_score * 0.15 +
          seasonality_score * 0.15
        );
        
        kw.search_volume = search_volume_score;
        kw.trend_score = trend_score;
        kw.competition_score = competition_score;
        kw.purchase_intent_score = purchase_intent_score;
        kw.final_score = final_score;
        kw.last_checked_at = new Date().toISOString();
        
        scoredKeywords.push(kw);
      }
      
      // API Rate limit 방어
      await new Promise((res) => setTimeout(res, 500));
    }

    // 4. 정렬 및 DB 업데이트
    scoredKeywords.sort((a, b) => b.final_score - a.final_score);
    
    // 상위 최대 10개 선택
    const selected = scoredKeywords.slice(0, 10);
    const rejected = scoredKeywords.slice(10);
    
    console.log(`[Keyword Engine] Selected ${selected.length} keywords.`);
    
    // Update DB
    for (const kw of selected) {
      await supabaseAdmin
        .from("keywords")
        .update({
          search_volume: kw.search_volume,
          trend_score: kw.trend_score,
          competition_score: kw.competition_score,
          purchase_intent_score: kw.purchase_intent_score,
          final_score: kw.final_score,
          status: "selected",
          last_checked_at: kw.last_checked_at,
        })
        .eq("id", kw.id);
    }
    
    for (const kw of rejected) {
      await supabaseAdmin
        .from("keywords")
        .update({
          search_volume: kw.search_volume,
          trend_score: kw.trend_score,
          competition_score: kw.competition_score,
          purchase_intent_score: kw.purchase_intent_score,
          final_score: kw.final_score,
          status: "rejected",
          last_checked_at: kw.last_checked_at,
        })
        .eq("id", kw.id);
    }

    console.log(`[Keyword Engine] Finished daily keyword selection.`);
    return selected;
    
  } catch (error) {
    console.error(`[Keyword Engine] Error:`, error);
    throw error;
  }
}

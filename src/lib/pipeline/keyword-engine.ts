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
    // 1. 아직 처리되지 않은(pending 또는 selected) 키워드 조회
    const { data: pendingKeywords, error: pendingError } = await supabaseAdmin
      .from("keywords")
      .select("*")
      .in("status", ["pending", "selected"])
      // 오래 점검하지 않은 키워드부터 순환 (항상 같은 50개만 보지 않도록)
      .order("last_checked_at", { ascending: true, nullsFirst: true })
      .limit(50);

    if (pendingError) throw pendingError;

    // 1.5. 연관 검색어 발굴 재료로 기존 키워드들 중 무작위 5개를 선택
    // (매일 같은 seed만 쓰면 새로운 연관검색어가 발굴되지 않으므로)
    // .limit(50)만 쓰면 항상 같은 앞쪽 행만 오므로 전체(최대 1000개)에서 Fisher-Yates로 샘플링
    const { data: seedCandidates } = await supabaseAdmin
      .from("keywords")
      .select("keyword, niche_id")
      .limit(1000);

    const pool = [...(seedCandidates || [])];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const baseKeywordsForRelated = pool.slice(0, 5);

    const allKeywordsToScore: Keyword[] = pendingKeywords ? [...pendingKeywords] : [];

    // 2. 연관 검색어 수집 및 저장 (seed별 자동완성 조회는 병렬)
    const relatedLists = await Promise.all(
      baseKeywordsForRelated.map((seed) => getRelatedKeywords(seed.keyword))
    );

    const candidates = new Map<string, string>(); // keyword -> niche_id
    relatedLists.forEach((related, i) => {
      for (const kw of related) {
        if (!candidates.has(kw)) candidates.set(kw, baseKeywordsForRelated[i].niche_id);
      }
    });

    if (candidates.size > 0) {
      // keyword 컬럼에 UNIQUE 제약이 없으므로 기존 키워드를 한 번에 조회해 중복 제외
      const { data: existing } = await supabaseAdmin
        .from("keywords")
        .select("keyword")
        .in("keyword", [...candidates.keys()]);
      const existingSet = new Set((existing || []).map((e) => e.keyword));

      const toInsert = [...candidates]
        .filter(([kw]) => !existingSet.has(kw))
        .map(([kw, nicheId]) => ({
          niche_id: nicheId,
          keyword: kw,
          source: "related",
          status: "pending",
        }));

      if (toInsert.length > 0) {
        const { data: inserted, error: insertError } = await supabaseAdmin
          .from("keywords")
          .insert(toInsert)
          .select("*");
        if (insertError) console.error(`[Keyword Engine] Failed to insert related keywords:`, insertError);
        if (inserted) allKeywordsToScore.push(...inserted);
      }
    }

    console.log(`[Keyword Engine] Total keywords to score: ${allKeywordsToScore.length}`);
    
    if (allKeywordsToScore.length === 0) {
      console.log(`[Keyword Engine] No keywords to score.`);
      return [];
    }

    // 3. 점수화 로직 실행
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    
    // 네이버 DataLab은 한 요청(최대 5개) 안에서의 상대값(ratio)만 주므로,
    // 모든 요청에 같은 기준 키워드(anchor)를 넣고 anchor 대비 비율로 정규화해 묶음 간 비교가 가능하게 함
    const anchor = allKeywordsToScore[0].keyword;
    const others = allKeywordsToScore.filter((k) => k.keyword !== anchor);
    const chunks: Keyword[][] = others.length === 0 ? [[]] : [];
    for (let i = 0; i < others.length; i += 4) chunks.push(others.slice(i, i + 4));

    const scoredKeywords: Keyword[] = [];
    let anchorScored = false;
    for (const chunk of chunks) {
      const kwNames = [anchor, ...chunk.map((k) => k.keyword)];
      // DataLab 실패 시 전체 파이프라인을 멈추지 않고 기본 점수로 진행
      const trends = await getSearchTrends(kwNames, startDate, endDate).catch((err) => {
        console.error(`[Keyword Engine] DataLab request failed, using default scores:`, err);
        return [];
      });
      const anchorRatio = trends.find((t) => t.keyword === anchor)?.ratio ?? 0;

      const targets = anchorScored ? chunk : [allKeywordsToScore[0], ...chunk];
      anchorScored = true;

      for (const kw of targets) {
        const trendData = trends.find((t) => t.keyword === kw.keyword);

        // anchor = 50 기준의 상대 검색량 (0~100으로 제한). anchor 데이터가 없으면 원본 ratio 사용
        let search_volume_score = 50;
        if (trendData) {
          search_volume_score = anchorRatio > 0
            ? Math.min(100, (trendData.ratio / anchorRatio) * 50)
            : trendData.ratio;
        }
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
        
        kw.search_volume = Math.round(search_volume_score); // DB 컬럼이 INT
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
    
    // 상위 최대 2개 선택 (Vercel 타임아웃 60초 내에 안전하게 완료되도록 제한)
    const selected = scoredKeywords.slice(0, 2);
    // 선택되지 않은 키워드는 영구 탈락(rejected)시키지 않고 점수만 갱신해 pending으로 유지
    // (매일 2개 외 전부 rejected 처리하면 키워드 풀이 금방 고갈됨)
    const notSelected = scoredKeywords.slice(2);
    
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
    
    for (const kw of notSelected) {
      await supabaseAdmin
        .from("keywords")
        .update({
          search_volume: kw.search_volume,
          trend_score: kw.trend_score,
          competition_score: kw.competition_score,
          purchase_intent_score: kw.purchase_intent_score,
          final_score: kw.final_score,
          status: "pending",
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

import { supabaseAdmin } from "../supabase/server";
import { getRelatedKeywords } from "../naver/keywords";
import { getSearchTrends } from "../naver/datalab";
import { discoverBestsellerKeywords } from "./bestseller-keywords";

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

    // 중복 판정은 공백을 무시하고 비교 ("무선 이어폰 추천" == "무선이어폰추천")
    const normalize = (k: string) => k.replace(/\s+/g, "");
    const knownKeywords = new Set((seedCandidates || []).map((k) => normalize(k.keyword)));
    const MAX_NEW_PER_RUN = 30; // 새 키워드가 한 번에 쏟아져 DataLab 호출/실행 시간이 늘어나는 것을 방지

    // niche slug -> id (쿠팡 베스트셀러 키워드의 카테고리 매핑용)
    const { data: niches } = await supabaseAdmin.from("niches").select("id, slug");
    const nicheIdBySlug = new Map((niches || []).map((n) => [n.slug, n.id]));

    // 2. 신규 키워드 후보 수집: 네이버 자동완성(병렬) + 대기 키워드가 적으면 쿠팡 베스트셀러
    const candidates: { keyword: string; niche_id: string; source: string }[] = [];
    const addCandidate = (keyword: string, nicheId: string | undefined, source: string) => {
      const key = normalize(keyword);
      if (!nicheId || knownKeywords.has(key)) return;
      knownKeywords.add(key);
      candidates.push({ keyword, niche_id: nicheId, source });
    };

    const relatedLists = await Promise.all(
      baseKeywordsForRelated.map((seed) => getRelatedKeywords(seed.keyword))
    );
    relatedLists.forEach((related, i) => {
      for (const kw of related) addCandidate(kw, baseKeywordsForRelated[i].niche_id, "related");
    });

    if ((pendingKeywords?.length ?? 0) < 10) {
      console.log(`[Keyword Engine] Few pending keywords; discovering from Coupang bestsellers.`);
      try {
        const fromBest = await discoverBestsellerKeywords((seedCandidates || []).map((k) => k.keyword));
        for (const d of fromBest) addCandidate(d.keyword, nicheIdBySlug.get(d.nicheSlug), "shopping_insight");
      } catch (error) {
        console.error(`[Keyword Engine] Bestseller discovery failed:`, error);
      }
    }

    if (candidates.length > 0) {
      // 베스트셀러 기반(구매 의도가 확실한) 키워드를 먼저 넣고, 나머지는 자동완성 후보로 채움
      candidates.sort((a, b) => Number(b.source === "shopping_insight") - Number(a.source === "shopping_insight"));
      const toInsert = candidates.slice(0, MAX_NEW_PER_RUN).map((c) => ({ ...c, status: "pending" }));

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("keywords")
        .insert(toInsert)
        .select("*");
      if (insertError) console.error(`[Keyword Engine] Failed to insert new keywords:`, insertError);
      if (inserted) allKeywordsToScore.push(...inserted);
      console.log(`[Keyword Engine] Inserted ${inserted?.length ?? 0} new keywords (candidates: ${candidates.length}).`);
    }

    // 점수화 대상은 실행당 최대 24개로 제한 (DataLab 호출 6회 이내 → 60초 제한 대응)
    if (allKeywordsToScore.length > 24) allKeywordsToScore.length = 24;

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

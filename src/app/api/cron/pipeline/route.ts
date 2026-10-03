import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { selectDailyKeywords } from "@/lib/pipeline/keyword-engine";
import { searchAndScoreProducts } from "@/lib/pipeline/product-engine";
import { generateArticles } from "@/lib/pipeline/content-engine";
import { supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 60; // Vercel 서버리스 함수 타임아웃을 최대 60초로 연장


export async function GET(request: Request) {
  // 인증: CRON_SECRET 헤더 검증 (미설정 시에도 거부 - fail closed)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[Pipeline Cron] CRON_SECRET is not configured; refusing to run.");
    return NextResponse.json({ error: "Cron secret not configured" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 타임아웃으로 강제 종료되어 running 상태로 남은 이전 작업 정리 (maxDuration보다 충분히 오래된 것)
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  await supabaseAdmin
    .from("jobs")
    .update({ status: "failed", error_message: "Timed out (stale running job)", finished_at: new Date().toISOString() })
    .eq("status", "running")
    .lt("started_at", staleBefore);

  // 작업 큐에 시작 기록
  const { data: job, error: jobError } = await supabaseAdmin
    .from("jobs")
    .insert({
      job_type: "daily_pipeline",
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (jobError || !job) {
    console.error("Failed to create job record", jobError);
    return NextResponse.json({ error: "Failed to initialize job" }, { status: 500 });
  }

  const jobId = job.id;

  try {
    console.log(`[Pipeline Cron] Starting daily pipeline (Job ID: ${jobId})`);
    
    // 1. 키워드 엔진
    const keywords = await selectDailyKeywords();
    if (keywords.length === 0) {
      await finishJob(jobId, "completed", { message: "No keywords to process" });
      return NextResponse.json({ status: "success", message: "No keywords to process" });
    }

    // 2. 상품 엔진
    const productData = await searchAndScoreProducts(keywords);
    if (productData.length === 0) {
      await finishJob(jobId, "completed", { message: "No products found for keywords" });
      return NextResponse.json({ status: "success", message: "No products found" });
    }

    // 3. 콘텐츠 엔진
    const articles = await generateArticles(productData);

    const result = {
      keywords_processed: keywords.length,
      articles_generated: articles.length,
    };

    await finishJob(jobId, "completed", result);
    // 자동 발행된 글이 있으면 홈/사이트맵 캐시 갱신
    if (articles.some((a) => a.status === "published")) {
      revalidatePath("/");
      revalidatePath("/sitemap.xml");
    }
    console.log(`[Pipeline Cron] Finished successfully.`);
    return NextResponse.json({ status: "success", result });

  } catch (error: unknown) {
    console.error(`[Pipeline Cron] Error in pipeline:`, error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    await finishJob(jobId, "failed", null, msg);
    return NextResponse.json({ error: "Pipeline failed", details: msg }, { status: 500 });
  }
}

async function finishJob(jobId: string, status: string, result_json?: unknown, error_message?: string) {
  await supabaseAdmin
    .from("jobs")
    .update({
      status,
      result_json,
      error_message,
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

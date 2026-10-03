import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function asUuid(value: unknown): string | null {
  return typeof value === "string" && UUID_RE.test(value) ? value : null;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const article_id = asUuid(body.article_id);
  const product_id = asUuid(body.product_id);
  if (!article_id || !product_id) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }

  // 봇 클릭은 실적 집계에서 제외
  const userAgent = request.headers.get("user-agent") || "";
  if (/bot|crawler|spider|preview/i.test(userAgent)) {
    return NextResponse.json({ success: true, skipped: true });
  }

  // 원문 UA를 저장하지 않고 해시만 저장 (개인정보 최소화)
  const user_agent_hash = createHash("sha256").update(userAgent).digest("hex").slice(0, 32);
  const referrer = typeof body.referrer === "string" ? body.referrer.slice(0, 500) : null;

  // keyword_id는 클라이언트 값 대신 글에서 조회 (위조 방지)
  const { data: article } = await supabaseAdmin
    .from("articles")
    .select("keyword_id")
    .eq("id", article_id)
    .maybeSingle();

  if (!article) {
    return NextResponse.json({ error: "Unknown article" }, { status: 404 });
  }

  // 서버리스 환경에서는 응답 후 미완료 작업이 버려질 수 있으므로 await
  const { error } = await supabaseAdmin.from("click_events").insert({
    article_id,
    product_id,
    keyword_id: article.keyword_id,
    referrer,
    user_agent_hash,
  });

  if (error) {
    console.error("Click log error:", error);
    return NextResponse.json({ error: "Failed to log click" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

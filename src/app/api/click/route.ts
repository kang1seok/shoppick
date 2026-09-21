import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { article_id, product_id, keyword_id, referrer } = body;

    // user agent 간단 해싱 또는 로깅
    const userAgent = request.headers.get("user-agent") || "";
    
    // 비동기로 click event 저장 (결과를 기다리지 않아도 됨)
    supabaseAdmin.from("click_events").insert({
      article_id,
      product_id,
      keyword_id,
      referrer,
      user_agent_hash: userAgent.slice(0, 50), // 임시 처리
    }).then(({ error }) => {
      if (error) console.error("Click log error:", error);
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 실제 환경에서는 어드민 세션 검증이 필요합니다.
  // 여기서는 간단화를 위해 패스하거나 API 키를 검증할 수 있습니다.
  
  const resolvedParams = await params;
  const articleId = resolvedParams.id;

  const { error } = await supabaseAdmin
    .from("articles")
    .update({
      status: "review",
      updated_at: new Date().toISOString(),
    })
    .eq("id", articleId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, status: "review" });
}

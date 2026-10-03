import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 인증은 src/middleware.ts (Basic Auth)에서 처리
  
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

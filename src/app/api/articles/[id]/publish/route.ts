import { NextResponse } from "next/server";
import { publishArticle } from "@/lib/pipeline/publishing-engine";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 실제 환경에서는 어드민 세션 검증 필요
  const resolvedParams = await params;
  const articleId = resolvedParams.id;

  try {
    await publishArticle(articleId);
    return NextResponse.json({ success: true, status: "published" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

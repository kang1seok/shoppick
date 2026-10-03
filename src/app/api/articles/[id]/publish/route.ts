import { NextResponse } from "next/server";
import { publishArticle } from "@/lib/pipeline/publishing-engine";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 인증은 src/middleware.ts (Basic Auth)에서 처리
  const resolvedParams = await params;
  const articleId = resolvedParams.id;

  // 관리자 화면의 <form> 제출이면 JSON 대신 목록으로 되돌려 보냄
  const isFormSubmit = (request.headers.get("content-type") || "").includes("application/x-www-form-urlencoded");

  try {
    await publishArticle(articleId);
    if (isFormSubmit) {
      return NextResponse.redirect(new URL("/admin/articles", request.url), 303);
    }
    return NextResponse.json({ success: true, status: "published" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

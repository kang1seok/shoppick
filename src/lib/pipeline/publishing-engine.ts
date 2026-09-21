import { supabaseAdmin } from "../supabase/server";
import { revalidatePath } from "next/cache";

/**
 * 게시글을 발행 상태로 변경하고 관련 캐시를 갱신
 */
export async function publishArticle(articleId: string): Promise<void> {
  console.log(`[Publishing Engine] Publishing article: ${articleId}`);

  // 1. 글 상태 조회
  const { data: article, error: fetchError } = await supabaseAdmin
    .from("articles")
    .select("status, slug")
    .eq("id", articleId)
    .single();

  if (fetchError || !article) {
    throw new Error(`Failed to fetch article: ${fetchError?.message}`);
  }

  if (article.status !== "review") {
    throw new Error(`Article is not in 'review' status (current: ${article.status})`);
  }

  // 2. 상태를 published로 변경
  const { error: updateError } = await supabaseAdmin
    .from("articles")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", articleId);

  if (updateError) {
    throw new Error(`Failed to publish article: ${updateError.message}`);
  }

  console.log(`[Publishing Engine] Article published successfully. Revalidating paths...`);

  // 3. Next.js 정적 캐시 무효화 (ISR)
  // 홈, 상세 페이지, 카테고리 등 관련 경로를 무효화
  revalidatePath("/");
  revalidatePath(`/post/${article.slug}`);
  // 기타 경로 무효화는 필요에 따라 추가
  
  console.log(`[Publishing Engine] Finished publishing workflow for ${articleId}.`);
}

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { supabaseAdmin } from "@/lib/supabase/server";

export const revalidate = 86400; // 하루 단위 갱신

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;

  // 정적 라우트
  // "준비 중" 페이지와 검색 결과 페이지는 사이트맵에서 제외 (thin content)
  const routes = [""].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
  }));

  // 카테고리(niches)
  const { data: niches } = await supabaseAdmin.from("niches").select("slug").eq("is_active", true);
  const categoryRoutes = (niches || []).map((niche) => ({
    url: `${baseUrl}/category/${niche.slug}`,
    lastModified: new Date().toISOString(),
  }));

  // 게시글(articles)
  const { data: articles } = await supabaseAdmin
    .from("articles")
    .select("slug, updated_at")
    .eq("status", "published");
  const postRoutes = (articles || []).map((post) => ({
    url: `${baseUrl}/post/${post.slug}`,
    lastModified: new Date(post.updated_at || Date.now()).toISOString(),
  }));

  return [...routes, ...categoryRoutes, ...postRoutes];
}

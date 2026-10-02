import { supabaseAdmin } from "@/lib/supabase/server";
import { Metadata } from "next";

export const revalidate = 86400; // 하루 단위 갱신

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Sitemap | 산다만다",
  };
}

export default async function sitemap() {
  const baseUrl = "https://sandamanda.vercel.app"; // 실제 배포 URL

  // 정적 라우트
  const routes = ["", "/deals", "/search"].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
  }));

  // 카테고리(niches)
  const { data: niches } = await supabaseAdmin.from("niches").select("slug");
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
    lastModified: new Date(post.updated_at).toISOString(),
  }));

  return [...routes, ...categoryRoutes, ...postRoutes];
}

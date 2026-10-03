import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { ArticleGrid, type ArticleCardData } from "@/components/ArticleCard";

export const revalidate = 300;

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

async function getNiche(slug: string) {
  const { data } = await supabaseAdmin
    .from("niches")
    .select("id, name, description")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: CategoryPageProps) {
  const { slug } = await params;
  const niche = await getNiche(decodeURIComponent(slug));
  if (!niche) return { title: "Not Found" };
  return {
    title: `${niche.name} 쇼핑 가이드 | 산다만다`,
    description: niche.description || `${niche.name} 추천 및 비교 가이드`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const niche = await getNiche(decodeURIComponent(slug));
  if (!niche) notFound();

  // keywords!inner 조인으로 해당 카테고리 키워드의 글만 조회
  const { data } = await supabaseAdmin
    .from("articles")
    .select("id, title, slug, meta_description, published_at, keywords!inner(keyword, niche_id, niches(name, slug)), article_products(rank, products(image_url))")
    .eq("status", "published")
    .eq("keywords.niche_id", niche.id)
    .order("published_at", { ascending: false })
    .limit(60);

  const articles = (data || []) as unknown as ArticleCardData[];

  return (
    <div className="space-y-8">
      <header className="py-8 space-y-2">
        <h1 className="text-3xl font-bold">{niche.name}</h1>
        {niche.description && <p className="text-muted-foreground">{niche.description}</p>}
      </header>
      <ArticleGrid articles={articles} emptyText="이 카테고리에 발행된 글이 아직 없습니다." />
    </div>
  );
}

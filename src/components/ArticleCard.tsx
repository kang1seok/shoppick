import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface ArticleCardData {
  id: string;
  title: string;
  slug: string;
  meta_description: string | null;
  published_at: string | null;
  keywords: {
    keyword: string;
    niches: { name: string; slug: string } | null;
  } | null;
  article_products: {
    rank: number | null;
    products: { image_url: string | null } | null;
  }[];
}

// Image of the top-ranked product (nested rows come back unordered)
function topProductImage(article: ArticleCardData): string {
  const sorted = [...(article.article_products || [])].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  return sorted[0]?.products?.image_url || "";
}

// Supabase select string matching ArticleCardData
export const ARTICLE_CARD_SELECT =
  "id, title, slug, meta_description, published_at, keywords(keyword, niches(name, slug)), article_products(rank, products(image_url))";

interface ArticleCardProps {
  article: ArticleCardData;
  /** Badge text shown on the card; defaults to the article keyword */
  label?: string;
  /** Load the image immediately (above-the-fold cards) */
  eager?: boolean;
}

export function ArticleCard({ article, label, eager = false }: ArticleCardProps) {
  const badge = label ?? article.keywords?.keyword ?? "추천";
  const imageUrl = topProductImage(article);
  const ogSrc = `/api/og?aspect=square&title=${encodeURIComponent(article.title)}&keyword=${encodeURIComponent(badge)}&imageUrl=${encodeURIComponent(imageUrl)}`;

  return (
    <Link href={`/post/${article.slug}`}>
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer overflow-hidden flex flex-col">
        <div className="relative w-full aspect-square bg-white border-b">
          {/* eslint-disable-next-line @next/next/no-img-element -- dynamic OG image route */}
          <img src={ogSrc} alt={article.title} loading={eager ? "eager" : "lazy"} className="absolute inset-0 w-full h-full object-cover" />
        </div>
        <CardHeader>
          <div className="mb-2 flex items-center justify-between gap-2">
            <Badge variant="outline" className="bg-primary/5 truncate">{badge}</Badge>
            {article.published_at && (
              <span className="text-xs text-muted-foreground shrink-0">
                {new Date(article.published_at).toLocaleDateString("ko-KR")}
              </span>
            )}
          </div>
          <CardTitle className="line-clamp-2 leading-tight text-lg">{article.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="line-clamp-2">{article.meta_description}</CardDescription>
        </CardContent>
      </Card>
    </Link>
  );
}

export function ArticleGrid({ articles, emptyText, label }: { articles: ArticleCardData[]; emptyText: string; label?: (a: ArticleCardData) => string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {articles.map((article, i) => (
        <ArticleCard key={article.id} article={article} label={label?.(article)} eager={i < 3} />
      ))}
      {articles.length === 0 && (
        <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/20 rounded-lg">
          {emptyText}
        </div>
      )}
    </div>
  );
}

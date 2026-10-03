import Link from "next/link";
import { Search, Menu } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";

async function getNiches(): Promise<{ name: string; slug: string }[]> {
  const { data } = await supabaseAdmin
    .from("niches")
    .select("name, slug")
    .eq("is_active", true)
    .order("priority", { ascending: false });
  return data || [];
}

function SearchForm({ className }: { className?: string }) {
  return (
    <form action="/search" method="GET" className={className} role="search">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <input
        type="search"
        name="q"
        placeholder="검색어를 입력하세요"
        aria-label="검색어"
        className="h-9 w-full rounded-md border border-input bg-transparent px-9 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </form>
  );
}

export async function Header() {
  // 카테고리 메뉴는 DB의 niches 기준 (하드코딩된 링크는 존재하지 않는 카테고리로 404가 났음)
  const niches = await getNiches();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl text-primary">산다만다</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {niches.map((n) => (
              <Link
                key={n.slug}
                href={`/category/${n.slug}`}
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                {n.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <SearchForm className="hidden sm:flex relative w-64" />
          {/* 모바일 메뉴: JS 없이 동작하는 details 드롭다운 */}
          <details className="md:hidden relative">
            <summary className="list-none cursor-pointer p-2 rounded-md hover:bg-accent [&::-webkit-details-marker]:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">메뉴 열기</span>
            </summary>
            <div className="absolute right-0 mt-2 w-64 rounded-md border bg-background shadow-lg p-3 space-y-2">
              <SearchForm className="flex relative sm:hidden" />
              {niches.map((n) => (
                <Link key={n.slug} href={`/category/${n.slug}`} className="block px-2 py-1.5 text-sm rounded hover:bg-accent">
                  {n.name}
                </Link>
              ))}
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

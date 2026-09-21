import { supabaseAdmin } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";

export const revalidate = 0; // 항상 최신 데이터

export default async function AdminArticlesPage() {
  const { data: articles } = await supabaseAdmin
    .from("articles")
    .select("id, title, slug, status, created_at, keywords(keyword)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">게시글 관리</h1>
      </div>
      
      <div className="bg-white border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>제목</TableHead>
              <TableHead>키워드</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>생성일</TableHead>
              <TableHead>관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles?.map((article: { id: string; title: string; slug: string; status: string; created_at: string; keywords: { keyword: string } }) => (
              <TableRow key={article.id}>
                <TableCell className="font-medium">
                  {article.title}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{article.keywords?.keyword}</Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={article.status === 'published' ? 'default' : (article.status === 'review' ? 'secondary' : 'outline')}
                  >
                    {article.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(article.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Link href={`/post/${article.slug}`} target="_blank" className={buttonVariants({ variant: "outline", size: "sm" })}>
                      보기
                    </Link>
                    {article.status === 'review' && (
                      <form action={`/api/articles/${article.id}/publish`} method="POST">
                        <Button type="submit" size="sm">발행</Button>
                      </form>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!articles?.length && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  게시글이 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

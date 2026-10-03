import { supabaseAdmin } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export const revalidate = 0; // 항상 최신 데이터

export default async function AdminKeywordsPage() {
  const { data } = await supabaseAdmin
    .from("keywords")
    .select("id, keyword, source, status, final_score, search_volume, created_at, niches(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  const keywords = (data || []) as unknown as {
    id: string;
    keyword: string;
    source: string;
    status: string;
    final_score: number | null;
    search_volume: number | null;
    created_at: string;
    niches: { name: string } | null;
  }[];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">키워드 관리</h1>
        <Button>Seed 키워드 추가</Button>
      </div>
      
      <div className="bg-white border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>키워드</TableHead>
              <TableHead>카테고리</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>출처</TableHead>
              <TableHead>총점</TableHead>
              <TableHead>검색량 점수</TableHead>
              <TableHead>생성일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keywords.map((kw) => (
              <TableRow key={kw.id}>
                <TableCell className="font-medium">
                  {kw.keyword}
                </TableCell>
                <TableCell>
                  {kw.niches?.name || "-"}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={kw.status === 'selected' ? 'default' : (kw.status === 'rejected' ? 'destructive' : 'secondary')}
                  >
                    {kw.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{kw.source}</Badge>
                </TableCell>
                <TableCell className="font-bold text-primary">
                  {kw.final_score ? kw.final_score.toFixed(1) : "-"}
                </TableCell>
                <TableCell>
                  {kw.search_volume ? kw.search_volume.toFixed(1) : "-"}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(kw.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
            {!keywords.length && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  수집된 키워드가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

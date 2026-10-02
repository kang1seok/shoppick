import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const [{ count: articleCount }, { count: keywordCount }] = await Promise.all([
    supabaseAdmin.from("articles").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("keywords").select("*", { count: "exact", head: true }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">대시보드</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">총 게시글 수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{articleCount || 0}개</div>
            <p className="text-xs text-muted-foreground">발행 대기 포함</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">수집된 키워드</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{keywordCount || 0}개</div>
            <p className="text-xs text-muted-foreground">자동 수집된 연관 키워드 포함</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">누적 클릭 수 (이번 달)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0건</div>
            <p className="text-xs text-muted-foreground">클릭 추적 준비 중</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-8 bg-white p-6 rounded-lg border shadow-sm">
        <h2 className="text-lg font-bold mb-4">최근 파이프라인 작업 로그</h2>
        <div className="text-sm text-muted-foreground">
          준비 중입니다...
        </div>
      </div>
    </div>
  );
}

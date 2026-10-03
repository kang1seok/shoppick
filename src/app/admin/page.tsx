import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

interface JobRow {
  id: string;
  status: string;
  result_json: { keywords_processed?: number; articles_generated?: number; message?: string } | null;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
}

function formatDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "-";
  const sec = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  return `${sec}초`;
}

export default async function AdminDashboard() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    { count: articleCount },
    { count: draftCount },
    { count: keywordCount },
    { count: clickCount },
    { data: jobs },
  ] = await Promise.all([
    supabaseAdmin.from("articles").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("articles").select("*", { count: "exact", head: true }).in("status", ["draft", "review"]),
    supabaseAdmin.from("keywords").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("click_events").select("*", { count: "exact", head: true }).gte("clicked_at", monthStart.toISOString()),
    supabaseAdmin
      .from("jobs")
      .select("id, status, result_json, error_message, started_at, finished_at")
      .order("created_at", { ascending: false })
      .limit(10),
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
            <p className="text-xs text-muted-foreground">검수 대기 {draftCount || 0}개 포함</p>
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
            <CardTitle className="text-sm font-medium">제휴 링크 클릭 (이번 달)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(clickCount || 0).toLocaleString()}건</div>
            <p className="text-xs text-muted-foreground">봇 클릭 제외</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 bg-white p-6 rounded-lg border shadow-sm">
        <h2 className="text-lg font-bold mb-4">최근 파이프라인 작업 로그</h2>
        {!jobs?.length ? (
          <div className="text-sm text-muted-foreground">실행 기록이 없습니다.</div>
        ) : (
          <ul className="divide-y text-sm">
            {(jobs as JobRow[]).map((job) => (
              <li key={job.id} className="py-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                <Badge
                  variant={job.status === "completed" ? "default" : job.status === "failed" ? "destructive" : "secondary"}
                >
                  {job.status}
                </Badge>
                <span className="text-muted-foreground">
                  {job.started_at ? new Date(job.started_at).toLocaleString("ko-KR") : "-"}
                </span>
                <span className="text-muted-foreground">소요 {formatDuration(job.started_at, job.finished_at)}</span>
                <span className="flex-1 min-w-0 truncate">
                  {job.error_message
                    ? job.error_message
                    : job.result_json?.message ??
                      `키워드 ${job.result_json?.keywords_processed ?? 0}개 → 글 ${job.result_json?.articles_generated ?? 0}개`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

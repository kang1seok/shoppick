export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = params.q || "";

  return (
    <div className="py-12">
      <h1 className="text-2xl font-bold mb-4">검색 결과: {q}</h1>
      <p className="text-muted-foreground">이 페이지는 준비 중입니다.</p>
    </div>
  );
}

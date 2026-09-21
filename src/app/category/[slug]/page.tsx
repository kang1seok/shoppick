interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const resolvedParams = await params;
  return (
    <div className="py-12">
      <h1 className="text-3xl font-bold mb-4">카테고리: {resolvedParams.slug}</h1>
      <p className="text-muted-foreground">이 페이지는 준비 중입니다.</p>
    </div>
  );
}

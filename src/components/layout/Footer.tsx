import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full border-t bg-muted/40 mt-12">
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-lg text-primary">산다만다</h3>
            <p className="text-sm text-muted-foreground">
              AI가 분석하는 스마트한 쇼핑 가이드
            </p>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/rss.xml" className="hover:underline">RSS</Link>
          </div>
        </div>
        
        <div className="mt-8 pt-4 border-t text-xs text-muted-foreground space-y-2">
          <p>
            &quot;이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.&quot;
          </p>
          <p>
            &copy; {new Date().getFullYear()} 산다만다. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

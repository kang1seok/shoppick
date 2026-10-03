import Link from "next/link";
import { BarChart, FileText, Key, LineChart, LogOut } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // 접근 제어는 src/middleware.ts (Basic Auth)에서 처리
  
  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      {/* 사이드바 */}
      <aside className="w-64 bg-white border-r hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b font-bold text-xl text-primary">
          산다만다 Admin
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <Link href="/admin" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100">
            <BarChart className="w-5 h-5 mr-3 text-gray-500" />
            대시보드
          </Link>
          <Link href="/admin/articles" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100">
            <FileText className="w-5 h-5 mr-3 text-gray-500" />
            게시글 관리
          </Link>
          <Link href="/admin/keywords" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100">
            <Key className="w-5 h-5 mr-3 text-gray-500" />
            키워드 관리
          </Link>
          <Link href="/admin/analytics" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100">
            <LineChart className="w-5 h-5 mr-3 text-gray-500" />
            실적 분석
          </Link>
        </nav>
        <div className="p-4 border-t">
          <Link href="/" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-red-600 hover:bg-red-50">
            <LogOut className="w-5 h-5 mr-3" />
            사이트로 돌아가기
          </Link>
        </div>
      </aside>

      {/* 메인 영역 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 md:hidden">
          <div className="font-bold text-lg">Admin</div>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

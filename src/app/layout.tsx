import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SITE_URL } from "@/lib/site";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
  variable: "--font-noto-sans-kr",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL), // OG 이미지 등 상대 URL을 절대 URL로 변환
  title: "산다만다 - AI 자동화 쇼핑 가이드",
  description: "쿠팡 최저가 비교 및 추천 가이드",
  verification: {
    google: "5trNR9GiVrhY6xoz_KMKT6V7xJevNko_ISrWO5f1-Oo",
    other: {
      "naver-site-verification": "4e2d4314788a5b526ee4737cc956c30b974eb5ad",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={cn("min-h-screen font-sans antialiased flex flex-col", notoSansKr.variable)}>
        <Header />
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}

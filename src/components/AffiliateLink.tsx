"use client";

import type { ReactNode } from "react";

interface AffiliateLinkProps {
  href: string;
  articleId: string;
  productId: string;
  className?: string;
  children: ReactNode;
}

/**
 * 쿠팡 제휴 링크. 클릭 시 /api/click 으로 비동기 기록 (sendBeacon은 페이지 이탈 중에도 전송 보장)
 */
export function AffiliateLink({ href, articleId, productId, className, children }: AffiliateLinkProps) {
  const track = () => {
    try {
      const body = JSON.stringify({
        article_id: articleId,
        product_id: productId,
        referrer: document.referrer || null,
      });
      const blob = new Blob([body], { type: "application/json" });
      if (!navigator.sendBeacon?.("/api/click", blob)) {
        void fetch("/api/click", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
      }
    } catch {
      // 추적 실패가 이동을 막으면 안 됨
    }
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={className}
      onClick={track}
      onAuxClick={track}
    >
      {children}
    </a>
  );
}

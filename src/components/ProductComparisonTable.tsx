import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { AffiliateLink } from "@/components/AffiliateLink";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import Image from "next/image";

interface CompareProduct {
  rank: number;
  productId: string;
  productName: string;
  price: number;
  rating: number | null;
  reviewCount: number | null;
  isRocket: boolean;
  deeplinkUrl: string;
  imageUrl?: string;
}

interface ProductComparisonTableProps {
  articleId: string;
  products: CompareProduct[];
}

export function ProductComparisonTable({ articleId, products }: ProductComparisonTableProps) {
  // 평점 데이터가 하나도 없으면 평점 열 자체를 숨김
  const hasRating = products.some((p) => p.rating !== null);

  return (
    <div className="rounded-md border overflow-x-auto my-8">
      <Table className="min-w-[600px]">
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[80px] text-center">순위</TableHead>
            <TableHead>상품 정보</TableHead>
            <TableHead className="text-right">가격</TableHead>
            {hasRating && <TableHead className="text-center">평점</TableHead>}
            <TableHead className="text-center w-[120px]">링크</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.rank}>
              <TableCell className="text-center font-bold text-lg">
                {product.rank}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  {product.imageUrl && (
                    <div className="relative w-12 h-12 flex-shrink-0 bg-white rounded-md border p-1">
                      <Image
                        src={product.imageUrl}
                        alt={product.productName}
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                  <div>
                    <div className="font-medium line-clamp-2 text-sm">
                      {product.productName}
                    </div>
                    {product.isRocket && (
                      <Badge variant="secondary" className="mt-1 text-[10px] h-4 bg-blue-50 text-blue-700">
                        로켓배송
                      </Badge>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right font-bold whitespace-nowrap">
                {product.price.toLocaleString()}원
              </TableCell>
              {hasRating && (
                <TableCell className="text-center">
                  {product.rating !== null ? (
                    <div className="flex flex-col items-center justify-center">
                      <div className="flex items-center text-yellow-500">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span className="text-sm font-semibold ml-1">
                          {product.rating.toFixed(1)}
                        </span>
                      </div>
                      {product.reviewCount !== null && (
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          ({product.reviewCount.toLocaleString()})
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
              )}
              <TableCell className="text-center">
                <AffiliateLink
                  href={product.deeplinkUrl}
                  articleId={articleId}
                  productId={product.productId}
                  className={cn(buttonVariants({ size: "sm" }), "w-full text-xs font-bold")}
                >
                  최저가 보기
                </AffiliateLink>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

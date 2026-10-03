import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { AffiliateLink } from "@/components/AffiliateLink";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Star } from "lucide-react";

interface ProductCardProps {
  articleId: string;
  product: {
    productId: string;
    productName: string;
    price: number;
    rating: number | null;
    reviewCount: number | null;
    isRocket: boolean;
    imageUrl: string;
    deeplinkUrl: string;
  };
}

export function ProductCard({ articleId, product }: ProductCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden h-full">
      <CardHeader className="p-0">
        <div className="relative aspect-square w-full bg-white">
          <Image
            src={product.imageUrl}
            alt={product.productName}
            fill
            className="object-contain p-4"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4 flex flex-col gap-2">
        {product.isRocket && (
          <div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
              로켓배송
            </Badge>
          </div>
        )}
        <h3 className="font-medium text-sm line-clamp-2 leading-tight">
          {product.productName}
        </h3>
        {product.rating !== null && (
          <div className="mt-auto pt-2 flex items-center gap-2">
            <div className="flex items-center text-yellow-500">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-sm font-semibold ml-1">{product.rating.toFixed(1)}</span>
            </div>
            {product.reviewCount !== null && (
              <span className="text-xs text-muted-foreground">
                ({product.reviewCount.toLocaleString()})
              </span>
            )}
          </div>
        )}
        <div className={cn("font-bold text-lg", product.rating === null && "mt-auto pt-2")}>
          {product.price.toLocaleString()}원
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <AffiliateLink
          href={product.deeplinkUrl}
          articleId={articleId}
          productId={product.productId}
          className={cn(buttonVariants(), "w-full font-bold")}
        >
          쿠팡에서 보기
        </AffiliateLink>
      </CardFooter>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { deleteProduct, getPriceInsight } from "@/app/actions";
import PriceChart from "./PriceChart";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
} from "lucide-react";
import Link from "next/link";

function sourceLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export default function ProductCard({ product }) {
  const [showChart, setShowChart] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [insight, setInsight] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Remove this product from tracking?")) return;

    setDeleting(true);
    await deleteProduct(product.id);
  };

  const handleGetInsight = async () => {
    setInsightLoading(true);
    const result = await getPriceInsight(product.id);
    setInsight(result.insight || result.error);
    setInsightLoading(false);
  };

  return (
    <Card className="perforated-top rounded-sm shadow-none gap-0 py-0 overflow-hidden">
      <div className="flex gap-3 px-4 pt-6 pb-3">
        {product.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="w-16 h-16 object-cover rounded-sm border border-border bg-secondary shrink-0"
          />
        )}

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium line-clamp-2 mb-1">
            {product.name}
          </h3>
          <div className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            {sourceLabel(product.url)}
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 dashed-divider">
        <div className="font-mono text-2xl font-bold pb-4">
          {product.currency} {product.current_price}
        </div>
      </div>

      <CardContent className="px-4 py-3 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowChart(!showChart)}
            className="gap-1 rounded-sm"
          >
            {showChart ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Hide Chart
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Show Chart
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            asChild
            className="gap-1 rounded-sm"
          >
            <Link href={product.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4" />
              View Product
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1 rounded-sm"
          >
            <Trash2 className="w-4 h-4" />
            Remove
          </Button>
        </div>

        {insight ? (
          <div className="flex items-start gap-2 rounded-sm bg-secondary/60 px-3 py-2 text-xs">
            <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5 text-stamp" />
            <span>{insight}</span>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGetInsight}
            disabled={insightLoading}
            className="gap-1.5 text-stamp hover:text-stamp hover:bg-stamp/10 -ml-2 rounded-sm"
          >
            {insightLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Get AI insight
          </Button>
        )}
      </CardContent>

      {showChart && (
        <CardFooter className="pt-0 px-4 pb-4">
          <PriceChart productId={product.id} />
        </CardFooter>
      )}

      <div className="barcode-strip text-border mt-2" />
    </Card>
  );
}

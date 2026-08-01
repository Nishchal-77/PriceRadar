"use client";

import { useState } from "react";
import {
  deleteProduct,
  getPriceInsight,
  suggestTargetPrice,
  setTargetPrice,
} from "@/app/actions";
import PriceChart from "./PriceChart";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink,
  Trash2,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
  Target,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function ProductCard({ product }) {
  const [showChart, setShowChart] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [insight, setInsight] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);

  const [target, setTarget] = useState(product.target_price ?? "");
  const [targetLoading, setTargetLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

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

  const handleSuggestTarget = async () => {
    setSuggesting(true);
    const result = await suggestTargetPrice(product.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      setTarget(result.targetPrice);
      toast.success(result.reason || "AI suggested a target price");
    }
    setSuggesting(false);
  };

  const handleSaveTarget = async () => {
    if (!target) return;
    setTargetLoading(true);
    const result = await setTargetPrice(product.id, parseFloat(target));
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Target price saved — we'll alert you when it's hit");
    }
    setTargetLoading(false);
  };

  return (
    <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all">
      <CardHeader className="pb-3">
        <div className="flex gap-4">
          {product.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name}
              className="w-20 h-20 object-cover rounded-lg border bg-secondary"
            />
          )}

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold line-clamp-2 mb-2">
              {product.name}
            </h3>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {product.currency} {product.current_price}
              </span>
              <Badge variant="secondary" className="gap-1">
                <TrendingDown className="w-3 h-3" />
                Tracking
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowChart(!showChart)}
            className="gap-1"
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

          <Button variant="outline" size="sm" asChild className="gap-1">
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
            className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
          >
            <Trash2 className="w-4 h-4" />
            Remove
          </Button>
        </div>

        {/* AI insight */}
        {insight ? (
          <div className="flex items-start gap-2 rounded-lg bg-secondary/60 px-3 py-2 text-xs">
            <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
            <span>{insight}</span>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGetInsight}
            disabled={insightLoading}
            className="gap-1.5 text-primary hover:text-primary hover:bg-primary/10 -ml-2"
          >
            {insightLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Get AI insight
          </Button>
        )}

        {/* Target price */}
        <div className="flex items-center gap-2 pt-1 border-t">
          <Target className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Input
            type="number"
            step="0.01"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Alert me at..."
            className="h-8 text-xs"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2 shrink-0"
            onClick={handleSuggestTarget}
            disabled={suggesting}
          >
            {suggesting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            size="sm"
            className="h-8 px-3 shrink-0"
            onClick={handleSaveTarget}
            disabled={targetLoading || !target}
          >
            Save
          </Button>
        </div>
      </CardContent>

      {showChart && (
        <CardFooter className="pt-0">
          <PriceChart productId={product.id} />
        </CardFooter>
      )}
    </Card>
  );
}

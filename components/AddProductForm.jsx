"use client";

import { useState } from "react";
import { addProduct, resolveProductQuery } from "@/app/actions";
import AuthModal from "./AuthModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, Link2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AddProductForm({ user, onAdded }) {
  const [mode, setMode] = useState("url"); // "url" | "ai"
  const [url, setUrl] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const trackUrl = async (targetUrl) => {
    const formData = new FormData();
    formData.append("url", targetUrl);

    const result = await addProduct(formData);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message || "Product tracked successfully!");
      onAdded?.();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setLoading(true);

    if (mode === "url") {
      await trackUrl(url);
      setUrl("");
    } else {
      const resolved = await resolveProductQuery(query);
      if (resolved.error) {
        toast.error(resolved.error);
      } else {
        toast.success(`Found it — tracking now...`);
        await trackUrl(resolved.url);
        setQuery("");
      }
    }

    setLoading(false);
  };

  return (
    <>
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex justify-center gap-1 mb-3">
          <button
            type="button"
            onClick={() => setMode("url")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition",
              mode === "url"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            <Link2 className="h-3 w-3" />
            Paste a link
          </button>
          <button
            type="button"
            onClick={() => setMode("ai")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition",
              mode === "ai"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            <Sparkles className="h-3 w-3" />
            Describe it (AI)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          {mode === "url" ? (
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste product URL (Amazon, Walmart, etc.)"
              className="h-12 text-base"
              required
              disabled={loading}
            />
          ) : (
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Try "cheapest 65-inch OLED TV on Amazon"'
              className="h-12 text-base"
              required
              disabled={loading}
            />
          )}

          <Button
            type="submit"
            disabled={loading}
            className="h-10 sm:h-12 px-8 shadow-sm shadow-primary/30"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === "ai" ? "Finding..." : "Adding..."}
              </>
            ) : (
              "Track Price"
            )}
          </Button>
        </form>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
}

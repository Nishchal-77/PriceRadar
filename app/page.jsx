"use client";

import { useState, useEffect } from "react";
import {
  Radar,
  Rabbit,
  Bell,
  Sparkles,
  ArrowDown,
} from "lucide-react";
import AuthButton from "@/components/AuthButton";
import ProductCard from "@/components/ProductCard";
import ThemeToggle from "@/components/ThemeToggle";
import AddProductForm from "@/components/AddProductForm";
import ChatAssistant from "@/components/ChatAssistant";
import { createClient } from "@/utils/supabase/client";
import { getProducts, getSavingsSummary } from "@/app/actions";

const FEATURES = [
  {
    icon: Rabbit,
    label: "Track any link",
    title: "Paste, and it's watched",
    description:
      "Drop in a product URL from any major retailer and PriceRadar starts checking it daily.",
  },
  {
    icon: Sparkles,
    label: "Or describe it",
    title: '"Cheapest 65″ OLED"',
    description:
      "No link handy? Describe what you want and PriceRadar finds and tracks the real listing.",
  },
  {
    icon: Bell,
    label: "Ask about it",
    title: "Chat with your watchlist",
    description:
      "“What dropped this week?” — a straight answer from an assistant scoped to your tracked items.",
  },
];

function Nav({ user }) {
  return (
    <header className="border-b border-border sticky top-0 z-20 bg-background/95 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-5">
        <div className="flex items-center gap-2 font-mono font-bold text-lg tracking-tight">
          <Radar className="h-5 w-5 text-stamp" strokeWidth={2.5} />
          PriceRadar
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <AuthButton user={user} />
        </div>
      </div>
    </header>
  );
}

function LandingPage() {
  return (
    <>
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 grid lg:grid-cols-[1fr_420px] gap-14 items-start">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-stamp mb-4">
            Keep the receipt before you buy
          </div>
          <h1 className="font-serif font-bold text-5xl sm:text-6xl leading-[1.1] mb-6 text-balance">
            Know the real price <br className="hidden sm:block" />
            before you{" "}
            <span className="italic font-semibold text-stamp">pay it</span>.
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mb-8 text-balance">
            Track anything you&apos;re about to buy. PriceRadar checks daily, and
            the moment the price drops, you get the receipt for what you
            saved.
          </p>
          <AddProductForm user={null} onAdded={() => {}} />
        </div>

        <div className="relative">
          <div className="relative h-[380px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1461151304267-38535e780c79?w=700&q=80"
              alt="A smart TV in a living room"
              className="absolute top-0 left-0 z-0 w-[78%] rounded-md shadow-2xl -rotate-2 transition-transform duration-300 ease-out hover:z-10 hover:scale-110 hover:rotate-0 cursor-zoom-in"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1558317374-067fb5f30001?w=500&q=80"
              alt="A robot vacuum cleaning a living room"
              className="absolute bottom-0 right-0 z-0 w-[52%] rounded-md shadow-2xl rotate-2 transition-transform duration-300 ease-out hover:z-10 hover:scale-110 hover:rotate-0 cursor-zoom-in"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80"
              alt="A smartphone on a desk"
              className="absolute bottom-14 left-6 z-0 w-[38%] rounded-md shadow-2xl rotate-3 ring-4 ring-background transition-transform duration-300 ease-out hover:z-10 hover:scale-110 hover:rotate-0 cursor-zoom-in"
            />
          </div>

          <div className="mt-8 border-l-2 border-stamp pl-4">
            <p className="font-mono text-lg leading-snug text-balance">
              &ldquo;Patience is the best discount code.&rdquo;
            </p>
            <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wide font-mono">
              No coupon needed — just a watchful eye.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-border">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-3">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className={`px-6 py-8 ${
                  index > 0 ? "sm:border-l border-border" : ""
                } ${index > 0 ? "border-t sm:border-t-0" : ""}`}
              >
                <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-stamp mb-3">
                  <Icon className="h-3.5 w-3.5" />
                  {feature.label}
                </div>
                <h3 className="font-semibold mb-1.5">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-8 text-sm text-muted-foreground font-mono">
        © PriceRadar — a smarter way to watch prices.
      </footer>
    </>
  );
}

function Dashboard({ user, products, savings, refreshProducts }) {
  return (
    <>
      <section className="max-w-6xl mx-auto px-6 pt-10 pb-4">
        <AddProductForm user={user} onAdded={refreshProducts} />
      </section>

      <section className="max-w-6xl mx-auto px-6">
        <div className="border border-dashed border-border rounded-sm px-5 py-4 flex items-center justify-between font-mono">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            {savings.productsWithDrop > 0
              ? `Total saved across ${savings.productsWithDrop} product${
                  savings.productsWithDrop === 1 ? "" : "s"
                }`
              : "Total saved"}
          </div>
          <div className="text-xl font-bold text-savings flex items-center gap-1">
            {savings.totalSaved > 0 && <ArrowDown className="h-4 w-4" />}
            {savings.currency}
            {savings.totalSaved.toLocaleString("en-IN", {
              maximumFractionDigits: 0,
            })}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-10">
        <h2 className="font-mono font-bold text-xl mb-6">
          Your Tracked Products
        </h2>

        {products.length === 0 ? (
          <div className="rounded-sm border border-dashed border-border py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
              <Radar className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              You haven&apos;t added any products yet.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export default function Home() {
  const supabase = createClient();

  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [savings, setSavings] = useState({
    totalSaved: 0,
    currency: "₹",
    productsWithDrop: 0,
  });

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const refreshProducts = async () => {
    const [productData, savingsData] = await Promise.all([
      getProducts(),
      getSavingsSummary(),
    ]);
    setProducts(productData);
    setSavings(savingsData);
  };

  useEffect(() => {
    if (!user) return;
    refreshProducts();
  }, [user]);

  return (
    <main className="min-h-screen bg-background">
      <Nav user={user} />

      {user ? (
        <Dashboard
          user={user}
          products={products}
          savings={savings}
          refreshProducts={refreshProducts}
        />
      ) : (
        <LandingPage />
      )}

      {user && <ChatAssistant />}
    </main>
  );
}

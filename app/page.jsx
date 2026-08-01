"use client";

import { useState, useEffect } from "react";
import { Radar, Rabbit, Shield, Bell, Sparkles } from "lucide-react";
import AuthButton from "@/components/AuthButton";
import ProductCard from "@/components/ProductCard";
import ThemeToggle from "@/components/ThemeToggle";
import AddProductForm from "@/components/AddProductForm";
import ChatAssistant from "@/components/ChatAssistant";
import { createClient } from "@/utils/supabase/client";
import { getProducts } from "@/app/actions";

export default function Home() {
  const supabase = createClient();

  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);

  // ✅ Load user session
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
    const data = await getProducts();
    setProducts(data);
  };

  // ✅ Fetch products when user logs in
  useEffect(() => {
    if (!user) return;
    refreshProducts();
  }, [user]);

  const FEATURES = [
    {
      icon: Rabbit,
      title: "Lightning Fast",
      description:
        "PriceRadar extracts prices in seconds, handling JavaScript and dynamic content",
    },
    {
      icon: Shield,
      title: "Always Reliable",
      description:
        "Works across all major e-commerce sites with built-in anti-bot protection",
    },
    {
      icon: Bell,
      title: "Smart Alerts",
      description: "Get notified instantly when prices drop below your target",
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-md border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground">
              <Radar className="h-4.5 w-4.5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">PriceRadar</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <AuthButton user={user} />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute top-10 right-1/4 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border bg-secondary/60 px-3 py-1 text-xs font-medium text-secondary-foreground mb-6">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            AI-powered price insights, built in
          </div>

          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 text-balance">
            Track Product Prices,{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Automatically
            </span>
          </h2>

          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto text-balance">
            Get notified when prices drop on Amazon, Flipkart, and more.
          </p>

          <AddProductForm user={user} onAdded={refreshProducts} />
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group rounded-2xl border bg-card p-6 text-center shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 group-hover:from-primary/25 group-hover:to-accent/25 transition-colors">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ✅ User's Products Section */}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-bold mb-6">Your Tracked Products</h2>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card/50 py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
              <Radar className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              You haven't added any products yet.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {user && <ChatAssistant />}
    </main>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Rabbit, Shield, Bell } from "lucide-react";
import AuthButton from "@/components/AuthButton";
import AuthModal from "@/components/AuthModal";
import ProductCard from "@/components/ProductCard";
import { createClient } from "@/utils/supabase/client";
import { addProduct, getProducts } from "@/app/actions";

export default function Home() {
  const supabase = createClient();

  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
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

  // ✅ Fetch products when user logs in
  useEffect(() => {
    const fetchProducts = async () => {
      if (!user) return;
      const data = await getProducts();
      setProducts(data);
    };

    fetchProducts();
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
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-blue-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-4">
          <h1 className="text-2xl font-bold text-blue-700">PriceRadar</h1>
          <AuthButton user={user} />
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="text-4xl font-bold text-gray-800 mb-4">
          Track Product Prices Automatically
        </h2>

        <p className="text-gray-600 text-lg mb-8">
          Get notified when prices drop on Amazon, Flipkart, and more.
        </p>

        {/* ✅ FORM USING SERVER ACTION */}
        <form
          action={async (formData) => {
            if (!user) {
              setShowAuthModal(true);
              return;
            }

            const result = await addProduct(formData);

            if (result?.error) {
              alert(result.error);
            } else if (result?.success) {
              alert(result.message);
              // Refresh products list after adding
              const data = await getProducts();
              setProducts(data);
            }
          }}
          className="flex justify-center gap-3"
        >
          <input
            type="text"
            name="url"
            placeholder="Paste product link here..."
            required
            className="w-96 px-4 py-3 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition"
          >
            Track Price
          </button>
        </form>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-8">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-xl shadow-md p-6 text-center hover:shadow-lg transition"
              >
                <Icon className="w-10 h-10 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-gray-800">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ✅ User's Products Section */}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          Your Tracked Products
        </h2>

        {products.length === 0 ? (
          <p className="text-gray-500">You haven’t added any products yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </main>
  );
}
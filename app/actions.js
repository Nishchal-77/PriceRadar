"use server";

import { createClient } from "@/utils/supabase/server";
import { scrapeProduct, searchProducts } from "@/lib/firecrawl";
import { grok, GROK_MODEL, parseJsonResponse } from "@/lib/grok";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function addProduct(formData) {
  const url = formData.get("url");

  if (!url) {
    return { error: "URL is required" };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated" };
    }

    // Scrape product data with Firecrawl
    const productData = await scrapeProduct(url);

    if (!productData) {
      return { error: "Could not extract product information from this URL" };
    }

    const newPrice = parseFloat(productData.currentPrice);
    const currency = productData.currencyCode || "USD";

    // Check if product exists
    const { data: existingProduct } = await supabase
      .from("products")
      .select("id, current_price")
      .eq("user_id", user.id)
      .eq("url", url)
      .single();

    const isUpdate = !!existingProduct;

    // Upsert product (insert or update)
    const { data: product, error } = await supabase
      .from("products")
      .upsert(
        {
          user_id: user.id,
          url,
          name: productData.productName,
          current_price: newPrice,
          currency: currency,
          image_url: productData.productImageUrl,
          user_email: user.email,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,url",
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) throw error;

    // Add to price history if new or price changed
    const shouldAddHistory =
      !isUpdate || existingProduct.current_price !== newPrice;

    if (shouldAddHistory) {
      await supabase.from("price_history").insert({
        product_id: product.id,
        price: newPrice,
        currency: currency,
      });
    }

    revalidatePath("/");
    return {
      success: true,
      product,
      message: isUpdate
        ? "Product updated with latest price!"
        : "Product added successfully!",
    };
  } catch (error) {
    console.error("Add product error:", error);
    return { error: error.message || "Failed to add product" };
  }
}

// DELETE product
export async function deleteProduct(productId) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) throw error;

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { error: error.message };
  }
}

// GET all products
export async function getProducts() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Get products error:", error);
    return [];
  }
}

// GET price history for a product
export async function getPriceHistory(productId) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("price_history")
      .select("*")
      .eq("product_id", productId)
      .order("checked_at", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Get price history error:", error);
    return [];
  }
}

// SIGN OUT
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/");
}

// ✨ AI: one-line insight about a product's price trend
export async function getPriceInsight(productId) {
  try {
    const supabase = await createClient();
    const { data: product } = await supabase
      .from("products")
      .select("name, current_price, currency")
      .eq("id", productId)
      .single();

    const { data: history } = await supabase
      .from("price_history")
      .select("price, checked_at")
      .eq("product_id", productId)
      .order("checked_at", { ascending: true });

    if (!product || !history || history.length < 2) {
      return { insight: "Not enough price history yet for an AI insight." };
    }

    const completion = await grok.chat.completions.create({
      model: GROK_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a terse shopping analyst. In one short sentence (max 25 words), summarize the price trend and give practical buy/wait advice. No markdown, no preamble.",
        },
        {
          role: "user",
          content: JSON.stringify({
            product: product.name,
            currency: product.currency,
            currentPrice: product.current_price,
            history: history.map((h) => ({
              price: h.price,
              date: h.checked_at,
            })),
          }),
        },
      ],
    });

    const insight = completion.choices[0]?.message?.content?.trim();
    return { insight: insight || "No insight available right now." };
  } catch (error) {
    console.error("AI insight error:", error);
    return { error: "Couldn't generate an AI insight right now." };
  }
}

// ✨ AI: resolve a natural-language product request into a trackable URL
export async function resolveProductQuery(query) {
  if (!query) return { error: "Describe what you're looking for" };

  try {
    const candidates = await searchProducts(query);

    if (candidates.length === 0) {
      return { error: "Couldn't find any matching products" };
    }

    const completion = await grok.chat.completions.create({
      model: GROK_MODEL,
      messages: [
        {
          role: "system",
          content:
            'You pick the single best-matching product page for a shopping request. Reply with ONLY JSON: {"url": "..."}. Pick from the given candidates only.',
        },
        {
          role: "user",
          content: JSON.stringify({ request: query, candidates }),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "";
    const { url } = parseJsonResponse(raw);

    if (!url) return { error: "Couldn't resolve that to a product link" };
    return { success: true, url };
  } catch (error) {
    console.error("Resolve product query error:", error);
    return { error: "Couldn't understand that request" };
  }
}

// ✨ AI: suggest a target price based on price history volatility
export async function suggestTargetPrice(productId) {
  try {
    const supabase = await createClient();
    const { data: product } = await supabase
      .from("products")
      .select("name, current_price, currency")
      .eq("id", productId)
      .single();

    const { data: history } = await supabase
      .from("price_history")
      .select("price")
      .eq("product_id", productId)
      .order("checked_at", { ascending: true });

    if (!product) return { error: "Product not found" };

    const prices = (history || []).map((h) => parseFloat(h.price));
    if (prices.length < 2) {
      return {
        error: "Need more price history before suggesting a target price",
      };
    }

    const completion = await grok.chat.completions.create({
      model: GROK_MODEL,
      messages: [
        {
          role: "system",
          content:
            'You recommend a realistic target price a shopper should set for a price-drop alert, based on historical prices. Reply with ONLY JSON: {"targetPrice": number, "reason": "short reason, max 20 words"}.',
        },
        {
          role: "user",
          content: JSON.stringify({
            product: product.name,
            currency: product.currency,
            currentPrice: product.current_price,
            priceHistory: prices,
          }),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "";
    const parsed = parseJsonResponse(raw);

    if (!parsed.targetPrice) return { error: "Couldn't suggest a price" };
    return {
      success: true,
      targetPrice: parsed.targetPrice,
      reason: parsed.reason,
    };
  } catch (error) {
    console.error("Suggest target price error:", error);
    return { error: "Couldn't generate a suggestion right now" };
  }
}

// Save a user-chosen (or AI-suggested) target price
export async function setTargetPrice(productId, targetPrice) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("products")
      .update({ target_price: targetPrice })
      .eq("id", productId);

    if (error) throw error;
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Set target price error:", error);
    return { error: error.message };
  }
}
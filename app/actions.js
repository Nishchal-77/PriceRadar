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

// Total saved across tracked products: for each product, the drop between
// the highest price ever recorded and the current price.
export async function getSavingsSummary() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { totalSaved: 0, currency: "₹", productsWithDrop: 0 };

    const { data: products } = await supabase
      .from("products")
      .select("id, current_price, currency")
      .eq("user_id", user.id);

    if (!products || products.length === 0) {
      return { totalSaved: 0, currency: "₹", productsWithDrop: 0 };
    }

    const ids = products.map((p) => p.id);
    const { data: history } = await supabase
      .from("price_history")
      .select("product_id, price")
      .in("product_id", ids);

    let totalSaved = 0;
    let productsWithDrop = 0;

    for (const product of products) {
      const prices = (history || [])
        .filter((h) => h.product_id === product.id)
        .map((h) => parseFloat(h.price));
      if (prices.length === 0) continue;

      const highest = Math.max(...prices, parseFloat(product.current_price));
      const saved = highest - parseFloat(product.current_price);
      if (saved > 0) {
        totalSaved += saved;
        productsWithDrop++;
      }
    }

    return { totalSaved, currency: "₹", productsWithDrop };
  } catch (error) {
    console.error("Get savings summary error:", error);
    return { totalSaved: 0, currency: "₹", productsWithDrop: 0 };
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

// Parse a budget ("under 20k", "45-50k", "between ₹45,000 and ₹50,000")
// out of a free-text shopping request. Returns { min?, max? } or null.
function parseBudget(text) {
  const t = text.toLowerCase().replace(/,/g, "");
  const toNumber = (numStr, suffix) => {
    let n = parseFloat(numStr);
    if (suffix === "k") n *= 1_000;
    else if (suffix === "l" || suffix === "lakh" || suffix === "lac") n *= 100_000;
    return n;
  };
  const unit = "(k|l|lakh|lac)?";

  let m = t.match(
    new RegExp(`₹?(\\d+(?:\\.\\d+)?)\\s*${unit}\\s*(?:-|to|and)\\s*₹?(\\d+(?:\\.\\d+)?)\\s*${unit}`)
  );
  if (m) {
    const min = toNumber(m[1], m[2] || m[4]);
    const max = toNumber(m[3], m[4] || m[2]);
    if (!isNaN(min) && !isNaN(max)) {
      return { min: Math.min(min, max), max: Math.max(min, max) };
    }
  }

  m = t.match(new RegExp(`(?:under|below|less than|within|max|up to)\\s*₹?(\\d+(?:\\.\\d+)?)\\s*${unit}`));
  if (m) {
    const max = toNumber(m[1], m[2]);
    if (!isNaN(max)) return { max };
  }

  m = t.match(new RegExp(`(?:above|over|more than|min)\\s*₹?(\\d+(?:\\.\\d+)?)\\s*${unit}`));
  if (m) {
    const min = toNumber(m[1], m[2]);
    if (!isNaN(min)) return { min };
  }

  return null;
}

// Reject category/search/listing pages so we only ever try to track a real
// single product — Firecrawl's JSON extraction on a listing page returns
// whatever product happens to be featured there, not the one the user asked
// for, which is how a "under 20k phone" request can end up tracking a
// random ₹22k item from a category browse page.
function isLikelyProductPage(url) {
  const u = url.toLowerCase();

  if (/amazon\.[a-z.]+\/.*\/dp\/[a-z0-9]+/.test(u)) return true;
  if (/flipkart\.com\/.+\/p\/itm/.test(u)) return true;
  if (/croma\.com\/.+\/p\/\d+/.test(u)) return true;
  if (/reliancedigital\.in\/.+\/p\/\d+/.test(u)) return true;
  if (/tatacliq\.com\/.+\/p-mp\d+/.test(u)) return true;
  if (/vijaysales\.com\/.+-\d+\.html/.test(u)) return true;

  // Known listing/category/search patterns across those same sites.
  if (/amazon\.[a-z.]+\/[^/]+\/(s|b)(\?|\/)/.test(u)) return false;
  if (/amazon\.[a-z.]+\/s\?/.test(u)) return false;
  if (/flipkart\.com\/q\//.test(u)) return false;
  if (/flipkart\.com\/search/.test(u)) return false;
  if (/croma\.com\/clp\//.test(u)) return false;
  if (/\/(category|categories|collections|browse)(\/|\?)/.test(u)) return false;
  if (/\bunder[-_]?\d/.test(u) || /\bbest[-_]/.test(u)) return false;

  // Unknown domain/pattern — allow it through, we can't be sure.
  return true;
}

// Rank the candidate listing pages for one search and return them best-first.
// Budget is deliberately NOT enforced here — search snippets rarely have a
// reliable price, and telling the model to filter by budget on unreliable
// text made it return an empty list instead of guessing. The real price
// gets checked after scraping each candidate, by the caller.
async function rankCandidates(originalQuery, searchedFor, candidates) {
  const completion = await grok.chat.completions.create({
    model: GROK_MODEL,
    messages: [
      {
        role: "system",
        content:
          'You rank real, currently-available product listing pages for a shopping request, based ONLY on the candidate titles/descriptions given (they reflect live search results, which are more current than your training data). If the request asks for the "latest"/"newest" model, identify the most recently released model actually present among the candidates — do not default to an older model you happen to recognize. Strongly prefer Indian e-commerce sites (amazon.in, flipkart.com, croma.com, reliancedigital.in, tatacliq.com, vijaysales.com) over any other site. Reject search/category/homepage links — only rank actual product pages. Reply with ONLY JSON: {"urls": ["best match first", "..."]}, up to 5 urls, picked from the given candidates only. Always include every plausible product-page candidate you\'re given, even if you\'re unsure of its exact price — do not return an empty list just because price isn\'t visible in the snippet.',
      },
      {
        role: "user",
        content: JSON.stringify({
          originalRequest: originalQuery,
          searchedFor,
          candidates,
        }),
      },
    ],
  });

  try {
    const { urls } = parseJsonResponse(completion.choices[0]?.message?.content || "{}");
    return urls || [];
  } catch (parseError) {
    console.error("Rank candidates JSON parse error:", parseError);
    return [];
  }
}

// Search for one product name, filter out category/listing pages, and rank
// the remaining candidates.
async function findRankedUrls(originalQuery, searchName) {
  const rawCandidates = await searchProducts(searchName);
  const productCandidates = rawCandidates.filter((c) => isLikelyProductPage(c.url));
  const candidates = productCandidates.length ? productCandidates : rawCandidates;

  if (candidates.length === 0) return [];
  return rankCandidates(originalQuery, searchName, candidates);
}

// ✨ AI: resolve a natural-language product request into a trackable URL
export async function resolveProductQuery(query) {
  if (!query) return { error: "Describe what you're looking for" };

  try {
    const budget = parseBudget(query);

    // Step 1: figure out what to actually search for. A request either
    // names a specific product ("ASUS Vivobook Go 14", "latest iPhone") —
    // in which case we search for exactly that — or it's an open-ended ask
    // ("a good TV in 45-50k", "best phone under 20k"). Searching an
    // open-ended request directly mostly surfaces "best of" listicles and
    // category pages, not real products, so instead we get the AI to name
    // specific real models that plausibly fit, and search for those by name.
    const planCompletion = await grok.chat.completions.create({
      model: GROK_MODEL,
      messages: [
        {
          role: "system",
          content:
            'You turn a shopper\'s request into concrete product search names for a live shopping search engine.\n' +
            'If the request names a specific product, reply with ONLY JSON: {"names": ["<brand + model + key spec, e.g. storage>"]}. If it says "latest"/"newest"/"current" model, do NOT guess a specific model number or year — your training data may be outdated. Instead keep the word "latest" in the name and let live search results determine the actual current model.\n' +
            'If the request is open-ended (a category + vibe/budget, e.g. "a good TV", "best phone under 20000", not one specific product), reply with ONLY JSON: {"names": ["Brand Model 1", "Brand Model 2", "Brand Model 3"]} — 3 to 5 SPECIFIC real product models (brand + model) currently sold in India that plausibly fit the category and any budget mentioned. Do not include the word "best" or a price range in these names, just concrete model names.',
        },
        { role: "user", content: query },
      ],
    });

    // The model occasionally emits malformed JSON here — fall back to
    // searching the raw query rather than failing the whole request.
    let plan = {};
    try {
      plan = parseJsonResponse(planCompletion.choices[0]?.message?.content || "{}");
    } catch (parseError) {
      console.error("Plan JSON parse error:", parseError);
    }
    // Kept small (2 names, 4 scrapes below): searchProducts() alone fires 4
    // Firecrawl requests, and Firecrawl's rate limit is ~15 req/min on this
    // plan — going wider risks a single request tripping that limit itself.
    const searchNames =
      Array.isArray(plan.names) && plan.names.length ? plan.names.slice(0, 2) : [query];

    // Search + rank every candidate name in parallel rather than one at a
    // time — sequential search+scrape per name was taking 2+ minutes,
    // risking a serverless timeout on a request triggered by a form submit.
    const rankedPerName = await Promise.all(
      searchNames.map((name) => findRankedUrls(query, `${name} price India`))
    );
    const orderedUrls = [...new Set(rankedPerName.flat())];

    if (orderedUrls.length === 0) {
      return { error: "Couldn't find any matching products" };
    }

    if (!budget) {
      return { success: true, url: orderedUrls[0] };
    }

    // Verify against real scraped prices (in parallel) — search snippets
    // can't be trusted for budget filtering — then pick the best-ranked
    // one that actually fits.
    const scraped = await Promise.all(
      orderedUrls.slice(0, 4).map(async (url) => ({
        url,
        productData: await scrapeProduct(url).catch(() => null),
      }))
    );

    for (const { url, productData } of scraped) {
      if (!productData?.currentPrice) continue;
      const price = parseFloat(productData.currentPrice);
      const withinBudget =
        (budget.min == null || price >= budget.min) &&
        (budget.max == null || price <= budget.max);
      if (withinBudget) return { success: true, url };
    }

    return {
      error: `Couldn't find a match in your budget (${
        budget.min != null ? `₹${budget.min.toLocaleString("en-IN")}` : "₹0"
      }–${budget.max != null ? `₹${budget.max.toLocaleString("en-IN")}` : "any"})`,
    };
  } catch (error) {
    console.error("Resolve product query error:", error);
    return { error: "Couldn't understand that request" };
  }
}


import FirecrawlApp from "@mendable/firecrawl-js";

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY,
});

export async function scrapeProduct(url, attempt = 1) {
  try {
    const result = await firecrawl.scrape(url, {
      formats: [
        {
          type: "json",
          prompt: `
You are a product scraper. Extract the following fields exactly as JSON:
{
  "productName": "...", 
  "currentPrice": 0, 
  "currencyCode": "...", 
  "productImageUrl": "..."
}
- Only return JSON.
- Do NOT include extra text.
- Use numbers for price.
          `,
          schema: {
            type: "object",
            properties: {
              productName: { type: "string" },
              currentPrice: { type: "number" },
              currencyCode: { type: "string" },
              productImageUrl: { type: "string" },
            },
          },
        },
      ],
    });

    console.log("Firecrawl result:", result);

    const extracted = result?.json;

    // fallback if extraction failed
    if (
      !extracted ||
      !extracted.productName ||
      !extracted.currentPrice ||
      extracted.currentPrice === 0
    ) {
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return scrapeProduct(url, attempt + 1);
      }
      return null;
    }

    return extracted;
  } catch (error) {
    console.error("Firecrawl scrape error:", error);
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return scrapeProduct(url, attempt + 1);
    }
    return null; // return null on error
  }
}

const INDIAN_SHOPPING_SITES = [
  "amazon.in",
  "flipkart.com",
  "croma.com",
  "reliancedigital.in",
  "tatacliq.com",
  "vijaysales.com",
];

export async function searchProducts(query) {
  try {
    // Run one broad India-biased search plus one per major site, then merge —
    // this finds real listings even when the generic search buries them.
    const searches = [
      firecrawl.search(`${query} price India`, {
        limit: 6,
        country: "in",
        location: "India",
        lang: "en",
      }),
      ...INDIAN_SHOPPING_SITES.slice(0, 3).map((site) =>
        firecrawl.search(`${query} site:${site}`, {
          limit: 2,
          country: "in",
          location: "India",
          lang: "en",
        })
      ),
    ];

    const results = await Promise.allSettled(searches);
    const seen = new Set();
    const items = [];

    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      const found = result.value?.web || result.value?.data || [];
      for (const item of found) {
        if (!item.url || seen.has(item.url)) continue;
        seen.add(item.url);
        items.push({
          url: item.url,
          title: item.title || "",
          description: item.description || "",
        });
      }
    }

    return items;
  } catch (error) {
    console.error("Firecrawl search error:", error);
    return [];
  }
}
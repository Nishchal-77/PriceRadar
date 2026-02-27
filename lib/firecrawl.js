import FirecrawlApp from "@mendable/firecrawl-js";

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY,
});

export async function scrapeProduct(url) {
  try {
    const result = await firecrawl.scrape(url, {
      formats: [
        {
          type: "json",
          prompt:
            "Extract the product name as productName, current price as currentPrice (number), currency code as currencyCode, and product image URL as productImageUrl.",
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

    const extracted = result.json;

    if (!extracted) {
      throw new Error("No data returned from Firecrawl");
    }

    return extracted; // ✅ return ONLY the json object

  } catch (error) {
    console.error("Firecrawl scrape error:", error);
    throw error;
  }
}
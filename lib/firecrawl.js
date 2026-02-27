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
      return null;
    }

    return extracted;
  } catch (error) {
    console.error("Firecrawl scrape error:", error);
    return null; // return null on error
  }
}
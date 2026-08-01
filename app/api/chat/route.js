import { createClient } from "@/utils/supabase/server";
import { grok, GROK_MODEL } from "@/lib/grok";

export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages } = await request.json();

  const { data: products } = await supabase
    .from("products")
    .select("id, name, current_price, currency, target_price, url")
    .eq("user_id", user.id);

  const productIds = (products || []).map((p) => p.id);
  const { data: history } = productIds.length
    ? await supabase
        .from("price_history")
        .select("product_id, price, checked_at")
        .in("product_id", productIds)
        .order("checked_at", { ascending: true })
    : { data: [] };

  const context = (products || []).map((p) => ({
    ...p,
    history: (history || [])
      .filter((h) => h.product_id === p.id)
      .map((h) => ({ price: h.price, date: h.checked_at })),
  }));

  const stream = await grok.chat.completions.create({
    model: GROK_MODEL,
    stream: true,
    messages: [
      {
        role: "system",
        content: `You are the PriceRadar shopping assistant. Answer questions about the user's tracked products using ONLY the data provided below. Be concise and helpful. If asked about something outside this data, say you can only help with their tracked products.\n\nTracked products (JSON): ${JSON.stringify(
          context
        )}`,
      },
      ...messages,
    ],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || "";
          if (text) controller.enqueue(encoder.encode(text));
        }
      } catch (error) {
        console.error("Chat stream error:", error);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

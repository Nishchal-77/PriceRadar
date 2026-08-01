import OpenAI from "openai";

export const grok = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || "missing-groq-api-key",
  baseURL: "https://api.groq.com/openai/v1",
});

export const GROK_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

export function parseJsonResponse(text) {
  const cleaned = text.trim().replace(/^```json\s*|^```\s*|```$/g, "");
  return JSON.parse(cleaned);
}

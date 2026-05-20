import Anthropic from "@anthropic-ai/sdk";
import type { AnimationConfig } from "@/types/animation";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You analyze children's learning images and produce animation configs.
Return ONLY valid JSON matching this TypeScript shape — no markdown, no explanation:

{
  "title": string,
  "subtitle": string,
  "kids": [{ "bodyColor": string, "hairColor": string, "skinTone": string, "name"?: string }],
  "lyrics": [{ "text": string, "startMs": number, "endMs": number }],
  "circles": [{ "timeMs": number, "x": number, "y": number, "radius": number, "color": string, "shape": "circle"|"square"|"triangle"|"star" }]
}

Rules:
- title/subtitle: short, kid-friendly, derived from the image theme
- kids: 1–3 characters with distinct hex colors matching visible clothing/skin/hair
- lyrics: 3–6 lines spanning 0–10000ms (10s total), educational and fun
- circles: 3–5 tap targets timed between 2000–9000ms, shapes and colors from the image
- x/y are normalized 0–1 (0.5 center); y should be 0.35–0.65 for shapes in the sky area
- Use brand orange #F4750A, yellow #FFD700, and cheerful palette colors`;

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

function toMediaType(mimeType: string): ImageMediaType {
  if (
    mimeType === "image/jpeg" ||
    mimeType === "image/png" ||
    mimeType === "image/gif" ||
    mimeType === "image/webp"
  ) {
    return mimeType;
  }
  return "image/jpeg";
}

function extractJson(text: string): AnimationConfig {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(raw) as AnimationConfig;
}

export async function analyzeImage(
  imageBase64: string,
  mimeType: string,
): Promise<AnimationConfig> {
  const response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: toMediaType(mimeType),
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: "Analyze this image and return ONLY the AnimationConfig JSON object.",
          },
        ],
      },
    ],
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Claude returned no text content");
  }

  return extractJson(block.text);
}

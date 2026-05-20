import { NextRequest, NextResponse } from "next/server";

type AnthropicSuccess = {
  content: Array<{ type: string; text?: string }>;
};

type AnthropicErrorBody = {
  error?: { message?: string };
};

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType } = await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not set" },
        { status: 500 },
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mimeType,
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: `Analyze this children's educational flashcard image. Return ONLY valid JSON, no markdown, no explanation:
{
  "title": "main title text on card",
  "subtitle": null,
  "lyrics": ["text line 1","text line 2","text line 3","text line 4","text line 5"],
  "shapes": ["circle","circle","circle"],
  "colors": {
    "primary": "#hexcolor",
    "secondary": "#hexcolor",
    "accent": "#hexcolor",
    "background": "#hexcolor"
  },
  "theme": "default",
  "kidCount": 3,
  "mood": "happy"
}
Rules: extract ALL visible text lines as lyrics (max 5). shapes = shape names visible (circle/square/star/triangle). colors from actual image colors. Return ONLY the JSON object, nothing else.`,
              },
            ],
          },
        ],
      }),
    });

    const data = (await response.json()) as AnthropicSuccess &
      AnthropicErrorBody;

    if (!response.ok) {
      console.error("Anthropic API error:", data);
      return NextResponse.json(
        { error: data?.error?.message || "API error" },
        { status: response.status },
      );
    }

    const block = data.content?.[0];
    const text =
      block?.type === "text" && typeof block.text === "string"
        ? block.text
        : null;
    if (!text) {
      return NextResponse.json(
        { error: "Unexpected API response shape" },
        { status: 502 },
      );
    }

    const raw = text
      .trim()
      .replace(/```json|```/g, "")
      .trim();

    const config = JSON.parse(raw);
    return NextResponse.json(config);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Route error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

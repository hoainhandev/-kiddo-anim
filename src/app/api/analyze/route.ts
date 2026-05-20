import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_ANIMATION_OPTIONS,
  type AnimationBackground,
  type AnimationCharacterStyle,
  type AnimationOptions,
  type AnimationSpeed,
  type AnimationTextSize,
} from "@/types/animation";

type AnthropicSuccess = {
  content: Array<{ type: string; text?: string }>;
};

type AnthropicErrorBody = {
  error?: { message?: string; type?: string };
};

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, options);

    if (res.status === 529 || res.status === 503) {
      const waitMs = Math.pow(2, i) * 1000;
      console.log(
        `Anthropic overloaded, retrying in ${waitMs}ms... (attempt ${i + 1}/${retries})`,
      );
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    return res;
  }
  throw new Error("Anthropic API is overloaded. Please try again in a moment.");
}

function isOverloaded(
  status: number,
  body?: AnthropicErrorBody,
): boolean {
  if (status === 529 || status === 503) return true;
  const msg = body?.error?.message?.toLowerCase() ?? "";
  const typ = body?.error?.type?.toLowerCase() ?? "";
  return msg.includes("overloaded") || typ.includes("overloaded");
}

const OVERLOADED_CLIENT_MESSAGE =
  "Server đang bận, vui lòng thử lại sau 10 giây!";

function parseOptions(raw: unknown): AnimationOptions {
  const base = { ...DEFAULT_ANIMATION_OPTIONS };
  if (!raw || typeof raw !== "object") return base;
  const p = raw as Partial<AnimationOptions>;
  return {
    ...base,
    ...p,
    kidCount:
      p.kidCount === 1 || p.kidCount === 2 || p.kidCount === 3
        ? p.kidCount
        : base.kidCount,
    duration:
      p.duration === 8 || p.duration === 10 || p.duration === 15
        ? p.duration
        : base.duration,
    background: (
      [
        "sky",
        "space",
        "ocean",
        "farm",
        "classroom",
      ] as AnimationBackground[]
    ).includes(p.background as AnimationBackground)
      ? (p.background as AnimationBackground)
      : base.background,
    speed: (
      ["slow", "normal", "fast"] as AnimationSpeed[]
    ).includes(p.speed as AnimationSpeed)
      ? (p.speed as AnimationSpeed)
      : base.speed,
    characterStyle: (
      ["happy", "excited", "calm"] as AnimationCharacterStyle[]
    ).includes(p.characterStyle as AnimationCharacterStyle)
      ? (p.characterStyle as AnimationCharacterStyle)
      : base.characterStyle,
    textSize: (
      ["small", "medium", "large"] as AnimationTextSize[]
    ).includes(p.textSize as AnimationTextSize)
      ? (p.textSize as AnimationTextSize)
      : base.textSize,
    hasConfetti:
      typeof p.hasConfetti === "boolean" ? p.hasConfetti : base.hasConfetti,
    hasParticles:
      typeof p.hasParticles === "boolean" ? p.hasParticles : base.hasParticles,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType, options: rawOptions } = await req.json();

    const options = parseOptions(rawOptions);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not set" },
        { status: 500 },
      );
    }

    const response = await fetchWithRetry(
      "https://api.anthropic.com/v1/messages",
      {
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
                  text: `User preferences: ${options.kidCount} kid characters, ${options.background} background theme, ${options.characterStyle} character mood, animation duration ${options.duration} seconds.

Analyze this children's educational flashcard image. Return ONLY valid JSON, no markdown, no explanation:
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
Rules: extract ALL visible text lines as lyrics (max 5). shapes = shape names visible (circle/square/star/triangle). colors from actual image colors. Honor user preferences above for kid count, background mood, and pacing context. Return ONLY the JSON object, nothing else.`,
                },
              ],
            },
          ],
        }),
      },
    );

    const data = (await response.json()) as AnthropicSuccess &
      AnthropicErrorBody;

    if (!response.ok) {
      console.error("Anthropic API error:", data);
      if (isOverloaded(response.status, data)) {
        return NextResponse.json(
          { error: OVERLOADED_CLIENT_MESSAGE },
          { status: 503 },
        );
      }
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
    return NextResponse.json({ ...config, ...options });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Route error:", message);
    if (
      message.toLowerCase().includes("overloaded") ||
      message.includes("Anthropic API is overloaded")
    ) {
      return NextResponse.json(
        { error: OVERLOADED_CLIENT_MESSAGE },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { API_COSTS, logCost } from "@/lib/costTracker";
import { rateLimit } from "@/lib/rateLimit";
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
  const { allowed } = rateLimit("analyze-global", 20, 60000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Quá nhiều yêu cầu. Thử lại sau." },
      { status: 429 },
    );
  }

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
          max_tokens: 4096,
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

Analyze this flashcard image in detail. Return ONLY valid JSON, no markdown, no explanation:

{
  "title": "main title",
  "subtitle": null,
  "lyrics": ["line1","line2","line3","line4","line5"],
  "scene": {
    "layout": "shapes_row | animals | letters | numbers | mixed",
    "mainSubject": "what is the primary visual subject",
    "subjectCount": 3,
    "subjectPositions": "row | scattered | grid | single_center",
    "hasCharacters": true,
    "characterCount": 3,
    "characterPositions": ["bottom-left","bottom-center","bottom-right"],
    "backgroundType": "solid | gradient | illustrated | photo",
    "backgroundDescription": "describe the background"
  },
  "subjects": [
    {
      "type": "circle | square | star | triangle | letter | number | animal | object",
      "label": "what it is",
      "color": "#hexcolor",
      "size": "small | medium | large",
      "positionX": 0.3,
      "positionY": 0.4
    }
  ],
  "characters": [
    {
      "hairColor": "#3a2010",
      "hairStyle": "short | long | curly | pigtails",
      "shirtColor": "#E84040",
      "pantsColor": "#4ab8d8",
      "skinColor": "#FDDBB4",
      "gender": "boy | girl | neutral",
      "hasGlasses": false,
      "positionHint": "left | center | right",
      "action": "standing | jumping | waving | pointing | running"
    }
  ],
  "colors": {
    "primary": "#hexcolor",
    "secondary": "#hexcolor",
    "accent": "#hexcolor",
    "background": "#hexcolor"
  },
  "animationHints": {
    "entryStyle": "bounce | slide | fade | pop | spin",
    "rhythm": "slow | medium | fast",
    "mood": "calm | happy | excited | playful",
    "keyAction": "specific animation for this card"
  },
  "sceneDescription": {
    "setting": "describe WHERE this scene takes place",
    "timeOfDay": "day | night | sunset | indoor",
    "weather": "sunny | rainy | cloudy | snowy | none",
    "backgroundColors": ["#color1", "#color2"],
    "backgroundElements": ["rain", "clouds", "trees", "buildings", "stars", "waves"],
    "groundType": "grass | sand | water | floor | none",
    "groundColor": "#hexcolor",
    "atmosphere": "calm | playful | exciting | mysterious | cheerful",
    "dominantColors": ["#color1", "#color2", "#color3"]
  },
  "spriteAnimation": {
    "shouldBounce": true,
    "bounceStyle": "gentle | energetic | none",
    "shouldWave": false,
    "facingDirection": "left | right | forward",
    "scaleInScene": "small | medium | large",
    "hasCompanions": false,
    "companionCount": 0
  },
  "theme": "shapes | animals | letters | numbers | nature | space | default",
  "kidCount": 3,
  "mood": "happy"
}

Analyze this image in extreme detail for animation generation:
- What is the exact setting/environment shown?
- What weather or atmospheric effects are present?
- What colors dominate the background?
- What elements appear in the background (trees, buildings, rain, etc)?
- What is on the ground?
- What is the overall mood/atmosphere?
- How should the main character be animated to match this scene?
Be very specific - every detail drives a custom animation.

Rules:
- For subjects: identify EVERY distinct visual element with approximate position (0.0=left/top to 1.0=right/bottom).
- For characters: if children/people are visible, extract their exact appearance and positionHint.
- For animationHints.keyAction: describe specifically what animation represents this card (e.g. 'three circles bounce in sequence from small to big', 'letters appear one by one').
- Extract ALL visible text as lyrics (max 5).
- Be very specific — this config drives a custom animation for this exact image.
- Honor user preferences for kid count and duration.
Return ONLY the JSON object.`,
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

    await logCost({
      api_name: "claude",
      action: "analyze",
      status: "success",
      cost_usd: API_COSTS.claude_analyze,
    });

    return NextResponse.json({ ...config, ...options });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Route error:", message);

    await logCost({
      api_name: "claude",
      action: "analyze",
      status: "error",
      cost_usd: 0,
      error_message: message,
    });
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

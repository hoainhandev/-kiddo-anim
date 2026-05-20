import { NextRequest, NextResponse } from "next/server";
import type { AnimationConfig } from "@/types/animation";
import { API_COSTS, logCost } from "@/lib/costTracker";
import { rateLimit } from "@/lib/rateLimit";

type AnthropicBlock = { type: string; text?: string };

export async function POST(req: NextRequest) {
  const { allowed } = rateLimit("generate-prompt-global", 20, 60000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Quá nhiều yêu cầu. Thử lại sau." },
      { status: 429 },
    );
  }

  try {
    const { imageBase64, mimeType, animationConfig } = (await req.json()) as {
      imageBase64: string;
      mimeType: string;
      animationConfig?: AnimationConfig;
    };

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "No API key" }, { status: 500 });
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
        max_tokens: 512,
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
                text: `You are creating an animation prompt for a children's educational video.

Based on this image, write a SHORT animation prompt (max 80 words) for Hailuo AI image-to-video.

The prompt should:
- Describe the character(s) doing a simple, cute animation
- Match the mood and style of the image exactly
- Be appropriate for children aged 3-8
- Focus on gentle, looping movements (bouncing, waving, blinking, swaying)
- Mention the background/environment from the image
- Keep the art style consistent with the original image

Image context: ${JSON.stringify(animationConfig?.sceneDescription ?? {})}

Write ONLY the animation prompt, nothing else. Max 80 words.`,
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg =
        (data as { error?: { message?: string } })?.error?.message ??
        "Prompt generation failed";
      return NextResponse.json({ error: errMsg }, { status: response.status });
    }

    const block = (data as { content?: AnthropicBlock[] }).content?.[0];
    const prompt =
      block?.type === "text" && typeof block.text === "string"
        ? block.text.trim()
        : null;

    if (!prompt) {
      return NextResponse.json(
        { error: "Unexpected API response shape" },
        { status: 502 },
      );
    }

    console.log("Generated prompt:", prompt);

    await logCost({
      api_name: "claude",
      action: "generate_prompt",
      status: "success",
      cost_usd: API_COSTS.claude_prompt,
    });

    return NextResponse.json({ prompt });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Prompt generation error:", message);

    await logCost({
      api_name: "claude",
      action: "generate_prompt",
      status: "error",
      cost_usd: 0,
      error_message: message,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

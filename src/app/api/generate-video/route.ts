import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";
import { calcHailuoCost, logCost } from "@/lib/costTracker";
import { rateLimit } from "@/lib/rateLimit";

export const maxDuration = 300;

const HAILUO_MODEL_FAST =
  "fal-ai/minimax/hailuo-02-fast/standard/image-to-video";
const HAILUO_MODEL_AUDIO = "fal-ai/minimax/hailuo-2.3/pro/image-to-video";

function extractVideoUrl(data: unknown): string | null {
  const d = data as { video?: { url?: string } };
  return d?.video?.url ?? null;
}

function serializeError(err: unknown): string {
  if (err instanceof Error) {
    const extra = err as Error & { status?: number; body?: unknown };
    return JSON.stringify(
      {
        message: err.message,
        name: err.name,
        status: extra.status,
        body: extra.body,
      },
      null,
      2,
    );
  }
  try {
    return JSON.stringify(err, null, 2);
  } catch {
    return String(err);
  }
}

export async function POST(req: NextRequest) {
  const { allowed } = rateLimit("generate-video-global", 5, 60000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Quá nhiều yêu cầu. Vui lòng chờ 1 phút." },
      { status: 429 },
    );
  }

  let duration = 6;
  let hasAudio = false;

  try {
    const body = await req.json();
    console.log("Request body keys:", Object.keys(body));
    console.log("hasAudio received:", body.hasAudio);

    const {
      imageBase64,
      mimeType,
      prompt,
      duration: reqDuration = 6,
      hasAudio: reqHasAudio = false,
    } = body;

    duration = Number(reqDuration) || 6;
    hasAudio = Boolean(reqHasAudio);
    const actualCost = calcHailuoCost(duration, "standard", hasAudio);

    const apiKey = process.env.FAL_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "FAL_API_KEY not configured" },
        { status: 500 },
      );
    }

    fal.config({ credentials: apiKey });

    const imageUrl = `data:${mimeType ?? "image/png"};base64,${imageBase64}`;
    const basePrompt = String(prompt ?? "");
    const model = hasAudio ? HAILUO_MODEL_AUDIO : HAILUO_MODEL_FAST;

    const input = {
      prompt: hasAudio
        ? `${basePrompt}. Include cheerful upbeat children's background music.`
        : basePrompt,
      image_url: imageUrl,
    };

    console.log("Model:", model);
    console.log("Has audio:", hasAudio);
    console.log("Submitting to fal.ai:", {
      model,
      hasAudio,
      inputKeys: Object.keys(input),
    });

    const result = await fal.subscribe(model, {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        console.log("Status:", update.status);
        if ("logs" in update && update.logs) {
          update.logs.forEach((log) => console.log("FAL:", log.message));
        }
      },
    });

    const resultData = result.data as Record<string, unknown> | undefined;
    console.log("Result keys:", Object.keys(resultData || {}));
    const videoUrlFromResult = extractVideoUrl(result.data);
    console.log("Video URL:", videoUrlFromResult?.slice(0, 60));

    await logCost({
      api_name: "hailuo",
      action: "generate_video",
      status: "success",
      cost_usd: actualCost,
      duration_seconds: duration,
      has_audio: hasAudio,
      metadata: { requestId: result.requestId, modelId: model },
    });

    return NextResponse.json({
      videoUrl: videoUrlFromResult,
      requestId: result.requestId,
      modelId: model,
      hasAudio,
      prompt: input.prompt,
    });
  } catch (err: unknown) {
    console.log("Full error:", serializeError(err));
    const message =
      err instanceof Error ? err.message : "Video generation failed";
    console.error("Generate video error:", message);

    const actualCost = calcHailuoCost(duration, "standard", hasAudio);
    await logCost({
      api_name: "hailuo",
      action: "generate_video",
      status: "error",
      cost_usd: actualCost,
      duration_seconds: duration,
      has_audio: hasAudio,
      error_message: message,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

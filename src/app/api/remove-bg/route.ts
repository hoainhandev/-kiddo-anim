import { NextRequest, NextResponse } from "next/server";
import { API_COSTS, logCost } from "@/lib/costTracker";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType } = await req.json();

    const apiKey = process.env.REMOVEBG_API_KEY;
    if (!apiKey || apiKey === "your_key_here") {
      await logCost({
        api_name: "removebg",
        action: "remove_bg",
        status: "error",
        cost_usd: 0,
        error_message: "API key not configured",
        metadata: { usedFallback: true },
      });
      return NextResponse.json({
        resultBase64: imageBase64,
        mimeType: mimeType ?? "image/png",
        usedFallback: true,
      });
    }

    const imageBuffer = Buffer.from(imageBase64, "base64");

    const formData = new FormData();
    formData.append(
      "image_file",
      new Blob([imageBuffer], { type: mimeType ?? "image/png" }),
      "image.png",
    );
    formData.append("size", "auto");

    const response = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Remove.bg error:", err);
      await logCost({
        api_name: "removebg",
        action: "remove_bg",
        status: "error",
        cost_usd: 0,
        error_message: err.slice(0, 200),
        metadata: { usedFallback: true },
      });
      return NextResponse.json({
        resultBase64: imageBase64,
        mimeType: mimeType ?? "image/png",
        usedFallback: true,
      });
    }

    const resultBuffer = await response.arrayBuffer();
    const resultBase64 = Buffer.from(resultBuffer).toString("base64");

    await logCost({
      api_name: "removebg",
      action: "remove_bg",
      status: "success",
      cost_usd: API_COSTS.removebg,
    });

    return NextResponse.json({
      resultBase64,
      mimeType: "image/png",
      usedFallback: false,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Remove bg error:", message);

    await logCost({
      api_name: "removebg",
      action: "remove_bg",
      status: "error",
      cost_usd: 0,
      error_message: message,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

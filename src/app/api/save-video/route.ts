import { randomUUID } from "crypto";
import { saveVideo, uploadFile } from "@/lib/supabase";
import type { AnimationConfig } from "@/types/animation";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart form data" },
      { status: 400 },
    );
  }

  const title = formData.get("title");
  const configRaw = formData.get("config");
  const thumbnail = formData.get("thumbnail");
  const mp4 = formData.get("mp4");

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  if (!configRaw || typeof configRaw !== "string") {
    return NextResponse.json({ error: "config is required" }, { status: 400 });
  }

  if (!(thumbnail instanceof File)) {
    return NextResponse.json(
      { error: "thumbnail file is required" },
      { status: 400 },
    );
  }

  if (!(mp4 instanceof File)) {
    return NextResponse.json({ error: "mp4 file is required" }, { status: 400 });
  }

  let config: AnimationConfig;
  try {
    config = JSON.parse(configRaw) as AnimationConfig;
  } catch {
    return NextResponse.json(
      { error: "config must be valid JSON" },
      { status: 400 },
    );
  }

  if (!config.subtitle) {
    return NextResponse.json(
      { error: "config must include subtitle" },
      { status: 400 },
    );
  }

  const id = randomUUID();
  const thumbPath = `${id}.jpg`;
  const videoPath = `${id}.mp4`;

  try {
    const [thumbnailUrl, mp4Url] = await Promise.all([
      uploadFile("thumbnails", thumbPath, thumbnail),
      uploadFile("videos", videoPath, mp4),
    ]);

    const video = await saveVideo({
      title,
      subtitle: config.subtitle,
      config,
      video_url: mp4Url,
      thumbnail_url: thumbnailUrl,
    });

    return NextResponse.json({
      id: video.id,
      thumbnail_url: thumbnailUrl,
      mp4_url: mp4Url,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save video";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

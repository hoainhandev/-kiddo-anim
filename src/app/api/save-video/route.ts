import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { AnimationConfig } from "@/types/animation";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const contentType = req.headers.get("content-type") || "";

    let title = "Untitled";
    let animation_config: AnimationConfig = {
      title: "Untitled",
      subtitle: null,
      lyrics: [],
    };
    let mp4_url: string | null = null;
    let thumbnail_url: string | null = null;
    let duration = 6;

    if (contentType.includes("application/json")) {
      const body = await req.json();
      title = body.title || "AI Video";
      animation_config = body.animation_config || animation_config;
      thumbnail_url = body.thumbnail_url ?? null;
      duration = body.duration ?? 6;

      const falVideoUrl =
        typeof body.mp4_url === "string" ? body.mp4_url : null;

      if (falVideoUrl?.includes("supabase")) {
        mp4_url = falVideoUrl;
        console.log(
          "=== SKIP RE-UPLOAD (already Supabase) ===",
          falVideoUrl.slice(0, 60),
        );
      } else if (falVideoUrl) {
        try {
          console.log("=== RE-UPLOAD START ===");
          console.log("Downloading from:", falVideoUrl.slice(0, 60));

          const videoRes = await fetch(falVideoUrl, { redirect: "follow" });
          console.log("Download status:", videoRes.status);
          console.log("Content-Type:", videoRes.headers.get("content-type"));

          if (!videoRes.ok) {
            throw new Error(`Download failed: ${videoRes.status}`);
          }

          const videoBuffer = await videoRes.arrayBuffer();
          console.log(
            "Buffer size:",
            (videoBuffer.byteLength / 1024 / 1024).toFixed(2),
            "MB",
          );

          const timestamp = Date.now();
          const filename = `hailuo_${timestamp}.mp4`;

          const { data: uploadData, error: uploadError } =
            await supabaseAdmin.storage
              .from("videos")
              .upload(filename, videoBuffer, {
                contentType: "video/mp4",
                upsert: true,
              });

          console.log("Upload data:", uploadData);
          console.log("Upload error:", uploadError);

          if (!uploadError) {
            const { data: urlData } = supabaseAdmin.storage
              .from("videos")
              .getPublicUrl(filename);
            mp4_url = urlData.publicUrl;
            console.log("=== RE-UPLOAD SUCCESS ===", mp4_url?.slice(0, 60));
          } else {
            console.error("=== RE-UPLOAD FAILED ===", uploadError);
            mp4_url = falVideoUrl;
          }
        } catch (err) {
          console.error("=== RE-UPLOAD EXCEPTION ===", err);
          mp4_url = falVideoUrl;
        }
      }
    } else {
      const formData = await req.formData();
      const configRaw = formData.get("config");
      const titleRaw = formData.get("title");

      if (!configRaw || typeof configRaw !== "string") {
        return NextResponse.json(
          { error: "config is required" },
          { status: 400 },
        );
      }

      const config = JSON.parse(configRaw) as AnimationConfig;
      animation_config = config;
      title =
        (typeof titleRaw === "string" ? titleRaw : null) ||
        config.title ||
        "Animation";
      duration = config.duration || 10;

      const thumbnail = formData.get("thumbnail");
      const mp4 = formData.get("mp4");
      const timestamp = Date.now();

      if (thumbnail instanceof File) {
        const buf = await thumbnail.arrayBuffer();
        const thumbPath = `thumb_${timestamp}.jpg`;
        const { error: thumbError } = await supabaseAdmin.storage
          .from("thumbnails")
          .upload(thumbPath, buf, {
            contentType: "image/jpeg",
            upsert: true,
          });
        if (!thumbError) {
          const { data } = supabaseAdmin.storage
            .from("thumbnails")
            .getPublicUrl(thumbPath);
          thumbnail_url = data.publicUrl;
        }
      }

      if (mp4 instanceof File) {
        const buf = await mp4.arrayBuffer();
        console.log(
          "Video size:",
          (buf.byteLength / 1024 / 1024).toFixed(2),
          "MB",
        );
        const mp4Path = `video_${timestamp}.mp4`;
        const { error: mp4Error } = await supabaseAdmin.storage
          .from("videos")
          .upload(mp4Path, buf, {
            contentType: "video/mp4",
            upsert: true,
          });
        if (!mp4Error) {
          const { data } = supabaseAdmin.storage
            .from("videos")
            .getPublicUrl(mp4Path);
          mp4_url = data.publicUrl;
        }
      }
    }

    const { data, error } = await supabase
      .from("videos")
      .insert([{ title, animation_config, thumbnail_url, mp4_url, duration }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Save video error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

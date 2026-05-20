import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { AnimationConfig } from "@/types/animation";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const configRaw = formData.get("config");
    const titleRaw = formData.get("title");
    const thumbnail = formData.get("thumbnail");
    const mp4 = formData.get("mp4");

    if (!configRaw || typeof configRaw !== "string") {
      return NextResponse.json({ error: "config is required" }, { status: 400 });
    }

    const config = JSON.parse(configRaw) as AnimationConfig;
    const title =
      (typeof titleRaw === "string" ? titleRaw : null) ||
      config.title ||
      "Untitled";

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    let thumbnail_url: string | null = null;
    let mp4_url: string | null = null;
    const timestamp = Date.now();

    if (thumbnail instanceof File) {
      const thumbBuffer = await thumbnail.arrayBuffer();
      const thumbPath = `thumb_${timestamp}.jpg`;
      const { error: thumbError } = await supabase.storage
        .from("thumbnails")
        .upload(thumbPath, thumbBuffer, {
          contentType: "image/jpeg",
          upsert: true,
        });
      if (!thumbError) {
        const { data } = supabase.storage
          .from("thumbnails")
          .getPublicUrl(thumbPath);
        thumbnail_url = data.publicUrl;
      }
    }

    if (mp4 instanceof File) {
      const mp4Buffer = await mp4.arrayBuffer();
      const mp4Path = `video_${timestamp}.mp4`;
      const { error: mp4Error } = await supabase.storage
        .from("videos")
        .upload(mp4Path, mp4Buffer, {
          contentType: "video/mp4",
          upsert: true,
        });
      if (!mp4Error) {
        const { data } = supabase.storage.from("videos").getPublicUrl(mp4Path);
        mp4_url = data.publicUrl;
      }
    }

    const { data, error } = await supabase
      .from("videos")
      .insert([
        {
          title,
          animation_config: config,
          thumbnail_url,
          mp4_url,
          duration: config.duration || 10,
        },
      ])
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

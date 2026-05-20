import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type ListedFile = {
  name: string;
  metadata?: { size?: number } | null;
};

async function listAllFiles(
  supabase: SupabaseClient,
  bucket: string,
  prefix = "",
): Promise<ListedFile[]> {
  const allFiles: ListedFile[] = [];

  const { data, error } = await supabase.storage.from(bucket).list(prefix, {
    limit: 1000,
    sortBy: { column: "created_at", order: "desc" },
  });

  if (error) throw error;
  if (!data) return allFiles;

  for (const item of data) {
    const itemPath = prefix ? `${prefix}/${item.name}` : item.name;

    if (item.metadata != null) {
      allFiles.push({
        name: itemPath,
        metadata: item.metadata as { size?: number },
      });
      continue;
    }

    const { data: subFiles, error: subError } = await supabase.storage
      .from(bucket)
      .list(itemPath, { limit: 1000 });

    if (subError) {
      console.error(`List ${bucket}/${itemPath} error:`, subError);
      continue;
    }

    if (subFiles && subFiles.length > 0) {
      for (const sub of subFiles) {
        if (sub.metadata != null) {
          allFiles.push({
            name: `${itemPath}/${sub.name}`,
            metadata: sub.metadata as { size?: number },
          });
        }
      }
    }
  }

  return allFiles;
}

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: dbVideos, count: dbVideoCount } = await supabase
      .from("videos")
      .select("id, title, mp4_url, thumbnail_url", { count: "exact" })
      .limit(10);

    console.log(
      "DB videos:",
      dbVideos?.map((v) => ({
        title: v.title,
        mp4_url: v.mp4_url?.slice(0, 60),
        thumbnail_url: v.thumbnail_url?.slice(0, 60),
      })),
    );
    console.log("DB video count:", dbVideoCount);

    const [videoFiles, thumbFiles] = await Promise.all([
      listAllFiles(supabaseAdmin, "videos"),
      listAllFiles(supabaseAdmin, "thumbnails"),
    ]);

    console.log(
      "Video files found:",
      videoFiles.length,
      videoFiles.map((f) => ({ name: f.name, size: f.metadata?.size })),
    );
    console.log("Thumb files found:", thumbFiles.length);

    const videoBytes = videoFiles.reduce(
      (sum, f) => sum + (f.metadata?.size || 0),
      0,
    );
    const thumbBytes = thumbFiles.reduce(
      (sum, f) => sum + (f.metadata?.size || 0),
      0,
    );
    const totalBytes = videoBytes + thumbBytes;
    const totalMB = totalBytes / (1024 * 1024);
    const limitMB = 1024;
    const usagePercent = (totalMB / limitMB) * 100;

    return NextResponse.json({
      totalMB: Math.round(totalMB * 10) / 10,
      videoMB: Math.round((videoBytes / (1024 * 1024)) * 10) / 10,
      thumbMB: Math.round((thumbBytes / (1024 * 1024)) * 10) / 10,
      limitMB,
      usagePercent: Math.round(usagePercent * 10) / 10,
      videoCount: videoFiles.length,
      thumbCount: thumbFiles.length,
      dbVideoCount: dbVideoCount ?? 0,
      status:
        usagePercent > 90 ? "critical" : usagePercent > 70 ? "warning" : "ok",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Storage usage error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

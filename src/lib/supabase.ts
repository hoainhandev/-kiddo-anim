import { createClient } from "@supabase/supabase-js";
import type { AnimationConfig, Video } from "@/types/animation";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars:", {
    url: !!supabaseUrl,
    key: !!supabaseKey,
  });
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseKey || "placeholder-key",
);

export async function getVideos(): Promise<Video[]> {
  console.log("getVideos called");
  const { data, error } = await supabase
    .from("videos")
    .select("*")
    .order("created_at", { ascending: false });

  console.log("getVideos result:", { data, error });

  if (error) {
    console.error("Supabase error:", error);
    throw new Error(error.message);
  }
  return (data ?? []) as Video[];
}

export async function saveVideo(params: {
  title: string;
  animation_config: AnimationConfig;
  thumbnail_url?: string | null;
  mp4_url?: string | null;
  duration?: number;
}): Promise<Video> {
  const { data, error } = await supabase
    .from("videos")
    .insert([params])
    .select()
    .single();

  if (error) throw error;
  return data as Video;
}

export async function uploadFile(
  bucket: string,
  path: string,
  blob: Blob,
): Promise<string> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  return data.publicUrl;
}

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { AnimationConfig, SaveVideoParams, Video } from "@/types/animation";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
);

type VideoRow = {
  id: string;
  title: string;
  subtitle: string;
  config: AnimationConfig;
  video_url: string;
  thumbnail_url: string | null;
  created_at: string;
};

export async function saveVideo(data: SaveVideoParams): Promise<Video> {
  const { data: row, error } = await supabase
    .from("videos")
    .insert({
      title: data.title,
      subtitle: data.subtitle,
      config: data.config,
      video_url: data.video_url,
      thumbnail_url: data.thumbnail_url ?? null,
    })
    .select()
    .single<VideoRow>();

  if (error) throw error;
  return row;
}

export async function getVideos(): Promise<Video[]> {
  const { data, error } = await supabase
    .from("videos")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<VideoRow[]>();

  if (error) throw error;
  return data ?? [];
}

export async function uploadFile(
  bucket: string,
  path: string,
  blob: Blob,
): Promise<string> {
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

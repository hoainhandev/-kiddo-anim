import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function extractStoragePath(url: string): { bucket: string; filename: string } | null {
  const parts = url.split("/public/");
  const path = parts[1]?.split("?")[0];
  if (!path) return null;
  const segments = path.split("/");
  const bucket = segments[0];
  const filename = segments.slice(1).join("/");
  if (!bucket || !filename) return null;
  return { bucket, filename };
}

async function removeFromStorage(
  supabaseAdmin: SupabaseClient,
  fileUrl: string | null | undefined,
  label: string,
) {
  if (!fileUrl?.includes("supabase")) return;

  const parsed = extractStoragePath(fileUrl);
  if (!parsed) return;

  const { error } = await supabaseAdmin.storage
    .from(parsed.bucket)
    .remove([parsed.filename]);

  if (error) {
    console.error(`Delete ${label} error:`, error);
  } else {
    console.log(`Deleted ${label} file:`, parsed.filename);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const id = body.id as string | undefined;
    const mp4_url = body.mp4_url as string | null | undefined;
    const thumbnail_url = body.thumbnail_url as string | null | undefined;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    await removeFromStorage(supabaseAdmin, mp4_url, "video");
    await removeFromStorage(supabaseAdmin, thumbnail_url, "thumbnail");

    const { error } = await supabase.from("videos").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Delete error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

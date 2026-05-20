import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "No URL" }, { status: 400 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${response.status}` },
        { status: response.status },
      );
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") ?? "video/mp4";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType.includes("video") ? contentType : "video/mp4",
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Proxy failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

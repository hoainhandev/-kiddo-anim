import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "kiddo_auth";

const PUBLIC_PATHS = ["/api/auth"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const cookieSecret = process.env.AUTH_COOKIE_SECRET;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (!cookieSecret) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Auth not configured" },
        { status: 503 },
      );
    }
    return NextResponse.next();
  }

  const authCookie = req.cookies.get(COOKIE_NAME);
  if (authCookie?.value === cookieSecret) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/analyze/:path*",
    "/api/generate-video/:path*",
    "/api/generate-prompt/:path*",
    "/api/remove-bg/:path*",
    "/api/save-video/:path*",
    "/api/delete-video/:path*",
    "/api/storage-usage/:path*",
    "/api/cost-summary/:path*",
    "/api/proxy-video/:path*",
  ],
};

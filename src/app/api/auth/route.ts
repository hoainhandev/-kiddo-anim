import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "kiddo_auth";

function getSecrets() {
  const passcode = process.env.APP_PASSCODE;
  const cookieSecret = process.env.AUTH_COOKIE_SECRET;
  if (!passcode || !cookieSecret) {
    return null;
  }
  return { passcode, cookieSecret };
}

export async function GET(req: NextRequest) {
  const secrets = getSecrets();
  if (!secrets) {
    return NextResponse.json(
      { error: "Auth not configured" },
      { status: 500 },
    );
  }

  const cookie = req.cookies.get(COOKIE_NAME);
  if (cookie?.value === secrets.cookieSecret) {
    return NextResponse.json({ authenticated: true });
  }

  return NextResponse.json({ authenticated: false }, { status: 401 });
}

export async function POST(req: NextRequest) {
  const secrets = getSecrets();
  if (!secrets) {
    return NextResponse.json(
      { error: "Auth not configured" },
      { status: 500 },
    );
  }

  const body = await req.json();
  const passcode = body.passcode as string | undefined;

  if (!passcode || passcode !== secrets.passcode) {
    await new Promise((r) => setTimeout(r, 1000));
    return NextResponse.json({ error: "Sai passcode" }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });

  res.cookies.set(COOKIE_NAME, secrets.cookieSecret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  return res;
}

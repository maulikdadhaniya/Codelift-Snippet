import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getJwtSecretBytes } from "@/lib/auth/jwt";
import { SESSION_COOKIE } from "@/lib/auth/constants";

async function verifySession(token: string | undefined) {
  if (!token) return null;
  const key = getJwtSecretBytes();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    const sub = payload.sub;
    if (!sub || typeof payload.email !== "string") return null;
    const firstName = typeof payload.firstName === "string" ? payload.firstName : "";
    const lastName = typeof payload.lastName === "string" ? payload.lastName : "";
    const mobile = typeof payload.mobile === "string" && payload.mobile ? payload.mobile : undefined;
    return { userId: sub, email: payload.email, firstName, lastName, mobile };
  } catch {
    return null;
  }
}

function isPublicPath(pathname: string) {
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) return true;
  if (pathname.startsWith("/api/auth/register")) return true;
  if (pathname.startsWith("/api/auth/login")) return true;
  if (pathname.startsWith("/api/auth/logout")) return true;
  if (pathname.startsWith("/api/auth/me")) return true;
  if (pathname.startsWith("/api/crypto/public-key")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

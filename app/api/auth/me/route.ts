import { cookies } from "next/headers";
import { getActiveSession } from "@/lib/auth/session";
import { readEncryptedPostBody, jsonEncrypted } from "@/lib/crypto/encrypted-post";
import { SESSION_COOKIE } from "@/lib/auth/constants";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = await readEncryptedPostBody(request);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { aesKey } = parsed;
  const session = await getActiveSession();

  if (!session) {
    const jar = await cookies();
    const hadCookie = jar.get(SESSION_COOKIE)?.value;
    const res = jsonEncrypted(aesKey, { success: true, user: null });
    if (hadCookie) {
      res.cookies.set(SESSION_COOKIE, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
    }
    return res;
  }

  return jsonEncrypted(aesKey, {
    success: true,
    user: {
      id: session.userId,
      email: session.email,
      firstName: session.firstName,
      lastName: session.lastName,
      role: session.role,
      ...(session.mobile ? { mobile: session.mobile } : {}),
    },
  });
}

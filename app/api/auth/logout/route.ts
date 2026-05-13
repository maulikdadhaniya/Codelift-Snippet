import { readEncryptedPostBody, jsonEncrypted } from "@/lib/crypto/encrypted-post";
import { SESSION_COOKIE } from "@/lib/auth/constants";

export async function POST(request: Request) {
  const parsed = await readEncryptedPostBody(request);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { aesKey } = parsed;

  const res = jsonEncrypted(aesKey, { success: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

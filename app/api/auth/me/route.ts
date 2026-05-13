import { getSessionFromCookies } from "@/lib/auth/session";
import { readEncryptedPostBody, jsonEncrypted } from "@/lib/crypto/encrypted-post";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = await readEncryptedPostBody(request);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { aesKey } = parsed;
  const session = await getSessionFromCookies();

  if (!session) {
    return jsonEncrypted(aesKey, { success: true, user: null });
  }

  return jsonEncrypted(aesKey, {
    success: true,
    user: {
      id: session.userId,
      email: session.email,
      firstName: session.firstName,
      lastName: session.lastName,
      ...(session.mobile ? { mobile: session.mobile } : {}),
    },
  });
}

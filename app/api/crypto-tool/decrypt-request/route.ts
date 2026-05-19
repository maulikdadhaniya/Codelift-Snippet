import { NextResponse } from "next/server";
import { getActiveSession } from "@/lib/auth/session";
import { decryptRequestEnvelope, parseRequestEnvelope } from "@/lib/crypto/hybrid-server";

export const runtime = "nodejs";

/**
 * Decrypts a v1 request envelope (same shape as /api/notes/rpc body) using the server RSA private key.
 * Plain JSON response — for debugging only; requires an authenticated session.
 */
export async function POST(request: Request) {
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const env = parseRequestEnvelope(body);
    const { plaintext } = decryptRequestEnvelope(env);
    let data: unknown;
    try {
      data = JSON.parse(plaintext) as unknown;
    } catch {
      data = plaintext;
    }
    return NextResponse.json({ success: true, data });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Decrypt failed";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

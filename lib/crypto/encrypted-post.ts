import { NextResponse } from "next/server";
import { decryptRequestEnvelope, encryptResponsePayload, parseRequestEnvelope } from "./hybrid-server";

export type EncryptedReadOk = { ok: true; aesKey: Buffer; data: unknown };
export type EncryptedReadFail = { ok: false; response: NextResponse };

export async function readEncryptedPostBody(request: Request): Promise<EncryptedReadOk | EncryptedReadFail> {
  let aesKey: Buffer;
  let plaintext: string;
  try {
    const json = await request.json();
    const env = parseRequestEnvelope(json);
    ({ aesKey, plaintext } = decryptRequestEnvelope(env));
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ success: false, error: "Invalid encrypted payload" }, { status: 400 }),
    };
  }

  try {
    const data = JSON.parse(plaintext) as unknown;
    return { ok: true, aesKey, data };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(encryptResponsePayload(aesKey, { success: false, error: "Invalid JSON payload" })),
    };
  }
}

export function jsonEncrypted(aesKey: Buffer, payload: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(encryptResponsePayload(aesKey, payload), init);
}

"use client";

import { encryptedPostJson } from "@/lib/crypto/hybrid-client";
import type { NotesRpcPayload, NotesRpcResult } from "@/lib/notes-rpc-types";

export async function notesRpc<T>(payload: NotesRpcPayload): Promise<T> {
  const result = await encryptedPostJson<NotesRpcResult<T>>("/api/notes/rpc", payload);
  if (!result || typeof result !== "object" || !("success" in result)) {
    throw new Error("Invalid RPC response");
  }
  if (!result.success) {
    throw new Error(result.error || "Request failed");
  }
  return result.data;
}

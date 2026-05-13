import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Note from "@/models/Note";
import { getSessionFromCookies } from "@/lib/auth/session";
import {
  decryptRequestEnvelope,
  encryptResponsePayload,
  parseRequestEnvelope,
} from "@/lib/crypto/hybrid-server";
import { decryptNoteDoc, encryptNoteField } from "@/lib/crypto/note-at-rest";
import type { NotesRpcPayload, NotesRpcResult } from "@/lib/notes-rpc-types";

export const runtime = "nodejs";

const TITLE_MAX = 60;
const CODE_MAX = 512 * 1024;

function ok<T>(data: T): NotesRpcResult<T> {
  return { success: true, data };
}

function fail(message: string): NotesRpcResult {
  return { success: false, error: message };
}

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let aesKey: Buffer;
  let plaintext: string;
  try {
    const json = await request.json();
    const env = parseRequestEnvelope(json);
    ({ aesKey, plaintext } = decryptRequestEnvelope(env));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Invalid encrypted payload";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }

  let payload: NotesRpcPayload;
  try {
    payload = JSON.parse(plaintext) as NotesRpcPayload;
  } catch {
    return NextResponse.json(encryptResponsePayload(aesKey, fail("Invalid JSON payload")));
  }

  await dbConnect();
  const userId = session.userId;

  const send = (result: NotesRpcResult) => NextResponse.json(encryptResponsePayload(aesKey, result));

  try {
    if (!payload || typeof payload !== "object" || !("op" in payload)) {
      return send(fail("Invalid RPC payload"));
    }

    switch (payload.op) {
      case "list": {
        const search =
          typeof payload.search === "string" && payload.search.trim()
            ? payload.search.trim()
            : undefined;
        const notes = await Note.find({ user: userId }).sort({ createdAt: -1 }).lean();
        const decrypted = notes.map((n) => decryptNoteDoc(n));
        if (!search) {
          return send(ok(decrypted));
        }
        const q = search.toLowerCase();
        const filtered = decrypted.filter(
          (n) => n.title.toLowerCase().includes(q) || n.code.toLowerCase().includes(q)
        );
        return send(ok(filtered));
      }
      case "get": {
        if (!mongoose.isValidObjectId(payload.id)) {
          return send(fail("Invalid id"));
        }
        const note = await Note.findOne({ _id: payload.id, user: userId }).lean();
        if (!note) {
          return send(fail("Note not found"));
        }
        return send(ok(decryptNoteDoc(note)));
      }
      case "create": {
        if (typeof payload.title !== "string" || !payload.title.trim()) {
          return send(fail("Title is required"));
        }
        if (typeof payload.code !== "string" || !payload.code.trim()) {
          return send(fail("Code is required"));
        }
        const t = payload.title.trim();
        const c = payload.code;
        if (t.length > TITLE_MAX) {
          return send(fail(`Title cannot exceed ${TITLE_MAX} characters`));
        }
        if (c.length > CODE_MAX) {
          return send(fail("Code snippet is too large"));
        }
        const doc = await Note.create({
          title: encryptNoteField(t),
          code: encryptNoteField(c),
          language: payload.language ?? "javascript",
          tags: payload.tags ?? [],
          user: userId,
        });
        const created = await Note.findById(doc._id).lean();
        if (!created) {
          return send(fail("Failed to create note"));
        }
        return send(ok(decryptNoteDoc(created)));
      }
      case "update": {
        if (!mongoose.isValidObjectId(payload.id)) {
          return send(fail("Invalid id"));
        }
        const patch: Record<string, unknown> = {};
        if (payload.title !== undefined) {
          if (typeof payload.title !== "string" || !payload.title.trim()) {
            return send(fail("Invalid title"));
          }
          const t = payload.title.trim();
          if (t.length > TITLE_MAX) {
            return send(fail(`Title cannot exceed ${TITLE_MAX} characters`));
          }
          patch.title = encryptNoteField(t);
        }
        if (payload.code !== undefined) {
          if (typeof payload.code !== "string" || !payload.code.trim()) {
            return send(fail("Invalid code"));
          }
          if (payload.code.length > CODE_MAX) {
            return send(fail("Code snippet is too large"));
          }
          patch.code = encryptNoteField(payload.code);
        }
        if (payload.language !== undefined) patch.language = payload.language;
        if (payload.tags !== undefined) patch.tags = payload.tags;
        if (payload.isFavorite !== undefined) patch.isFavorite = payload.isFavorite;

        const note = await Note.findOneAndUpdate({ _id: payload.id, user: userId }, patch, {
          new: true,
          runValidators: true,
        }).lean();
        if (!note) {
          return send(fail("Note not found"));
        }
        return send(ok(decryptNoteDoc(note)));
      }
      case "delete": {
        if (!mongoose.isValidObjectId(payload.id)) {
          return send(fail("Invalid id"));
        }
        const r = await Note.deleteOne({ _id: payload.id, user: userId });
        if (r.deletedCount === 0) {
          return send(fail("Note not found"));
        }
        return send(ok({ deleted: true }));
      }
      default:
        return send(fail("Unknown operation"));
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return send(fail(message));
  }
}

import crypto from "node:crypto";

const PREFIX = "enc:v1:";

function getKey(): Buffer {
  const hex = process.env.NOTE_AT_REST_KEY;
  if (hex && /^[0-9a-fA-F]{64}$/.test(hex)) {
    return Buffer.from(hex, "hex");
  }
  const jwt = process.env.JWT_SECRET;
  if (!jwt) {
    throw new Error("Set NOTE_AT_REST_KEY (64 hex chars) or JWT_SECRET for note encryption");
  }
  return crypto.createHash("sha256").update(`codelift-note-at-rest|${jwt}`).digest();
}

export function encryptNoteField(plain: string): string {
  if (plain.startsWith(PREFIX)) {
    return plain;
  }
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, enc, tag]).toString("base64");
}

export function decryptNoteField(stored: string): string {
  if (!stored.startsWith(PREFIX)) {
    return stored;
  }
  const key = getKey();
  const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
  if (raw.length < 12 + 16 + 1) {
    throw new Error("Corrupt encrypted field");
  }
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(raw.length - 16);
  const enc = raw.subarray(12, raw.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

export function decryptNoteDoc<T extends { title: string; code: string }>(doc: T): T {
  return {
    ...doc,
    title: decryptNoteField(doc.title),
    code: decryptNoteField(doc.code),
  };
}

export function encryptNoteDocFields<T extends { title: string; code: string }>(plain: T): T {
  return {
    ...plain,
    title: encryptNoteField(plain.title),
    code: encryptNoteField(plain.code),
  };
}

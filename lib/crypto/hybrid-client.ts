"use client";

import type { RequestEnvelopeV1, ResponseEnvelopeV1 } from "./hybrid-server";

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk)) as unknown as number[]
    );
  }
  return btoa(binary);
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function pemPublicKeyToSpki(pem: string): Uint8Array {
  const trimmed = pem.trim().replace(/\\n/g, "\n");
  const b64 = trimmed
    .replace(/-----BEGIN PUBLIC KEY-----/g, "")
    .replace(/-----END PUBLIC KEY-----/g, "")
    .replace(/\s/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

let cached: { pem: string; key: CryptoKey; fetchedAt: number } | null = null;
const CACHE_MS = 60 * 60 * 1000;

async function importRsaPublicKey(pem: string): Promise<CryptoKey> {
  const spki = pemPublicKeyToSpki(pem);
  return crypto.subtle.importKey(
    "spki",
    spki as BufferSource,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );
}

async function getServerPublicKey(): Promise<CryptoKey> {
  const now = Date.now();
  if (cached && now - cached.fetchedAt < CACHE_MS) {
    return cached.key;
  }
  const res = await fetch("/api/crypto/public-key", { credentials: "include" });
  const data = await res.json();
  if (!data.success || typeof data.publicKeyPem !== "string") {
    throw new Error(data.error || "Failed to load encryption public key");
  }
  const key = await importRsaPublicKey(data.publicKeyPem);
  cached = { pem: data.publicKeyPem, key, fetchedAt: now };
  return key;
}

export async function buildRequestEnvelope(plaintextJson: unknown): Promise<{
  envelope: RequestEnvelopeV1;
  aesKey: CryptoKey;
}> {
  const rsaPub = await getServerPublicKey();

  const aesKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plainBytes = new TextEncoder().encode(JSON.stringify(plaintextJson));

  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    aesKey,
    plainBytes
  );

  const aesRaw = await crypto.subtle.exportKey("raw", aesKey);
  const wrappedKey = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, rsaPub, aesRaw);

  const envelope: RequestEnvelopeV1 = {
    v: 1,
    wrappedKey: uint8ToBase64(new Uint8Array(wrappedKey)),
    iv: uint8ToBase64(iv),
    ciphertext: uint8ToBase64(new Uint8Array(cipherBuf)),
  };

  return { envelope, aesKey };
}

export async function exportAesKeyBase64(aesKey: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", aesKey);
  return uint8ToBase64(new Uint8Array(raw));
}

export async function importAesKeyFromBase64(b64: string): Promise<CryptoKey> {
  const raw = base64ToUint8(b64.trim());
  if (raw.length !== 32) {
    throw new Error("AES key must be 32 bytes (base64-decoded)");
  }
  return crypto.subtle.importKey("raw", raw as BufferSource, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
}

export async function decryptResponseEnvelopeAsText(aesKey: CryptoKey, envelope: ResponseEnvelopeV1): Promise<string> {
  if (envelope.v !== 1) {
    throw new Error("Unsupported response envelope");
  }
  const iv = base64ToUint8(envelope.iv);
  const combined = base64ToUint8(envelope.ciphertext);
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource, tagLength: 128 },
    aesKey,
    combined as BufferSource
  );
  return new TextDecoder().decode(plainBuf);
}

export async function decryptResponseEnvelope(aesKey: CryptoKey, envelope: ResponseEnvelopeV1): Promise<unknown> {
  const text = await decryptResponseEnvelopeAsText(aesKey, envelope);
  return JSON.parse(text) as unknown;
}

export async function encryptedPostJson<T>(url: string, body: unknown): Promise<T> {
  const { envelope, aesKey } = await buildRequestEnvelope(body);
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(envelope),
  });

  const raw = await res.json().catch(() => ({}));

  const isEnvelope =
    raw &&
    typeof raw === "object" &&
    (raw as { v?: unknown }).v === 1 &&
    typeof (raw as { iv?: unknown }).iv === "string" &&
    typeof (raw as { ciphertext?: unknown }).ciphertext === "string";

  if (isEnvelope) {
    let decrypted: unknown;
    try {
      decrypted = await decryptResponseEnvelope(aesKey, raw as ResponseEnvelopeV1);
    } catch {
      throw new Error(!res.ok ? res.statusText || "Request failed" : "Invalid encrypted response");
    }
    if (!res.ok) {
      const obj = decrypted as { error?: string; message?: string };
      throw new Error(obj.error || obj.message || res.statusText || "Request failed");
    }
    return decrypted as T;
  }

  if (!res.ok) {
    const err =
      typeof raw === "object" && raw && "error" in raw ? String((raw as { error?: string }).error) : res.statusText;
    throw new Error(err || "Request failed");
  }

  throw new Error("Invalid encrypted response");
}

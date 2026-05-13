import crypto from "node:crypto";

export type RequestEnvelopeV1 = {
  v: 1;
  wrappedKey: string;
  iv: string;
  ciphertext: string;
};

export type ResponseEnvelopeV1 = {
  v: 1;
  iv: string;
  ciphertext: string;
};

function getPrivateKeyPem() {
  const pem = process.env.RSA_PRIVATE_KEY_PEM;
  if (!pem) {
    throw new Error("RSA_PRIVATE_KEY_PEM is not set");
  }
  return pem.replace(/\\n/g, "\n");
}

export function decryptRequestEnvelope(envelope: RequestEnvelopeV1): {
  aesKey: Buffer;
  plaintext: string;
} {
  if (envelope.v !== 1) {
    throw new Error("Unsupported envelope version");
  }

  const privateKey = crypto.createPrivateKey(getPrivateKeyPem());
  const wrappedKey = Buffer.from(envelope.wrappedKey, "base64");
  const aesKey = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    wrappedKey
  );

  if (aesKey.length !== 32) {
    throw new Error("Invalid AES key length");
  }

  const iv = Buffer.from(envelope.iv, "base64");
  if (iv.length !== 12) {
    throw new Error("Invalid IV length");
  }

  const combined = Buffer.from(envelope.ciphertext, "base64");
  if (combined.length < 17) {
    throw new Error("Invalid ciphertext");
  }

  const authTag = combined.subarray(combined.length - 16);
  const enc = combined.subarray(0, combined.length - 16);

  const decipher = crypto.createDecipheriv("aes-256-gcm", aesKey, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");

  return { aesKey, plaintext };
}

export function encryptResponsePayload(aesKey: Buffer, payload: unknown): ResponseEnvelopeV1 {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", aesKey, iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([enc, tag]);
  return {
    v: 1,
    iv: iv.toString("base64"),
    ciphertext: combined.toString("base64"),
  };
}

export function parseRequestEnvelope(body: unknown): RequestEnvelopeV1 {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid body");
  }
  const o = body as Record<string, unknown>;
  if (o.v !== 1 || typeof o.wrappedKey !== "string" || typeof o.iv !== "string" || typeof o.ciphertext !== "string") {
    throw new Error("Invalid encrypted envelope");
  }
  return {
    v: 1,
    wrappedKey: o.wrappedKey,
    iv: o.iv,
    ciphertext: o.ciphertext,
  };
}

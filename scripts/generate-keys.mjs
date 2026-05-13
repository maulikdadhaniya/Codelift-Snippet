import crypto, { generateKeyPairSync } from "node:crypto";

const jwtSecret = crypto.randomBytes(32).toString("hex");
const noteAtRest = crypto.randomBytes(32).toString("hex");

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

console.log(`
Paste into .env.local:

JWT_SECRET=${jwtSecret}

NOTE_AT_REST_KEY=${noteAtRest}

RSA_PUBLIC_KEY_PEM=${JSON.stringify(publicKey.trim())}

RSA_PRIVATE_KEY_PEM=${JSON.stringify(privateKey.trim())}
`);

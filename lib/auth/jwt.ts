import { SignJWT, jwtVerify } from "jose";

export function getJwtSecretBytes(): Uint8Array | null {
  const s = process.env.JWT_SECRET;
  if (!s) return null;
  return new TextEncoder().encode(s);
}

function requireSecret() {
  const key = getJwtSecretBytes();
  if (!key) {
    throw new Error("JWT_SECRET is not set");
  }
  return key;
}

export type SessionProfile = {
  firstName: string;
  lastName: string;
  mobile?: string;
};

export async function signSessionToken(userId: string, email: string, profile: SessionProfile) {
  const claims = {
    email,
    firstName: profile.firstName,
    lastName: profile.lastName,
    ...(profile.mobile ? { mobile: profile.mobile } : {}),
  };
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(requireSecret());
}

export async function verifySessionToken(token: string) {
  const key = getJwtSecretBytes();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    const sub = payload.sub;
    if (!sub || typeof payload.email !== "string") return null;
    const firstName = typeof payload.firstName === "string" ? payload.firstName : "";
    const lastName = typeof payload.lastName === "string" ? payload.lastName : "";
    const mobile = typeof payload.mobile === "string" && payload.mobile ? payload.mobile : undefined;
    return { userId: sub, email: payload.email, firstName, lastName, mobile };
  } catch {
    return null;
  }
}

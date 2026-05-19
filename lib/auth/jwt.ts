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

export type UserRole = "user" | "admin";

export type SessionProfile = {
  firstName: string;
  lastName: string;
  mobile?: string;
  role: UserRole;
};

export type SessionClaims = {
  sub: string;
  email: string;
  firstName: string;
  lastName: string;
  mobile?: string;
  role: UserRole;
};

export async function signSessionToken(userId: string, email: string, profile: SessionProfile) {
  const claims = {
    email,
    firstName: profile.firstName,
    lastName: profile.lastName,
    role: profile.role,
    ...(profile.mobile ? { mobile: profile.mobile } : {}),
  };
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(requireSecret());
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  const key = getJwtSecretBytes();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    const sub = payload.sub;
    if (!sub || typeof payload.email !== "string") return null;
    const firstName = typeof payload.firstName === "string" ? payload.firstName : "";
    const lastName = typeof payload.lastName === "string" ? payload.lastName : "";
    const mobile = typeof payload.mobile === "string" && payload.mobile ? payload.mobile : undefined;
    const role: UserRole = payload.role === "admin" ? "admin" : "user";
    return { sub, email: payload.email, firstName, lastName, mobile, role };
  } catch {
    return null;
  }
}

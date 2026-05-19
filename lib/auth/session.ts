import { cookies } from "next/headers";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { SESSION_COOKIE } from "./constants";
import { verifySessionToken, type UserRole } from "./jwt";

export type ActiveSession = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  mobile?: string;
  role: UserRole;
};

export async function getSessionFromCookies(): Promise<ActiveSession | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const claims = await verifySessionToken(token);
  if (!claims) return null;
  return {
    userId: claims.sub,
    email: claims.email,
    firstName: claims.firstName,
    lastName: claims.lastName,
    mobile: claims.mobile,
    role: claims.role,
  };
}

/** JWT valid and user exists and is not revoked. */
export async function getActiveSession(): Promise<ActiveSession | null> {
  const session = await getSessionFromCookies();
  if (!session) return null;

  await dbConnect();
  const user = await User.findById(session.userId).select("isRevoked role email").lean();
  if (!user || user.isRevoked) return null;

  return session;
}

export async function requireActiveSession(): Promise<ActiveSession | null> {
  return getActiveSession();
}

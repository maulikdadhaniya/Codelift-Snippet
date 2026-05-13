import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./constants";
import { verifySessionToken } from "./jwt";

export async function getSessionFromCookies() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

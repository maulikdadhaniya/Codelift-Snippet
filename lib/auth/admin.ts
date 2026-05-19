import { getActiveSession } from "./session";

export async function requireAdminSession() {
  const session = await getActiveSession();
  if (!session) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }
  if (session.role !== "admin") {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }
  return { ok: true as const, session };
}

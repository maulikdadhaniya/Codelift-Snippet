export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureStaticAdminUser } = await import("@/lib/auth/static-admin");
    try {
      await ensureStaticAdminUser();
    } catch {
      // MongoDB may be unavailable during build; login still provisions admin.
    }
  }
}

import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { hashPassword } from "@/lib/auth/password";
import type { IUser } from "@/models/User";

export function getStaticAdminConfig() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return null;
  return {
    email,
    password,
    firstName: process.env.ADMIN_FIRST_NAME?.trim() || "Admin",
    lastName: process.env.ADMIN_LAST_NAME?.trim() || "User",
  };
}

export function isStaticAdminLogin(email: string, password: string) {
  const cfg = getStaticAdminConfig();
  if (!cfg) return false;
  return email === cfg.email && password === cfg.password;
}

/** Ensures the env-defined admin exists in MongoDB (role admin, not revoked). */
export async function ensureStaticAdminUser(): Promise<IUser | null> {
  const cfg = getStaticAdminConfig();
  if (!cfg) return null;

  await dbConnect();
  const passwordHash = await hashPassword(cfg.password);

  let user = await User.findOne({ email: cfg.email }).select("+passwordHash");
  if (user) {
    user.firstName = cfg.firstName;
    user.lastName = cfg.lastName;
    user.role = "admin";
    user.isRevoked = false;
    user.passwordHash = passwordHash;
    await user.save();
    return user;
  }

  user = await User.create({
    email: cfg.email,
    firstName: cfg.firstName,
    lastName: cfg.lastName,
    role: "admin",
    isRevoked: false,
    passwordHash,
  });
  return user;
}

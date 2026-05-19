import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { verifyPassword } from "@/lib/auth/password";
import { signSessionToken, type UserRole } from "@/lib/auth/jwt";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { readEncryptedPostBody, jsonEncrypted } from "@/lib/crypto/encrypted-post";
import { ensureStaticAdminUser, isStaticAdminLogin } from "@/lib/auth/static-admin";

export const runtime = "nodejs";

function sessionResponse(
  aesKey: Buffer,
  user: { _id: unknown; email: string; firstName: string; lastName: string; mobile?: string; role: UserRole }
) {
  const firstName = user.firstName ?? "";
  const lastName = user.lastName ?? "";
  const role: UserRole = user.role === "admin" ? "admin" : "user";
  const profile: { firstName: string; lastName: string; role: UserRole; mobile?: string } = {
    firstName,
    lastName,
    role,
    ...(user.mobile ? { mobile: user.mobile } : {}),
  };
  const token = signSessionToken(String(user._id), user.email, profile);

  const res = jsonEncrypted(aesKey, {
    success: true,
    user: {
      id: String(user._id),
      email: user.email,
      firstName,
      lastName,
      role,
      ...(user.mobile ? { mobile: user.mobile } : {}),
    },
  });

  return token.then((t) => {
    res.cookies.set(SESSION_COOKIE, t, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  });
}

export async function POST(request: Request) {
  const parsed = await readEncryptedPostBody(request);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { aesKey, data } = parsed;
  const body = data as { email?: unknown; password?: unknown };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return jsonEncrypted(aesKey, { success: false, error: "Email and password required" }, { status: 400 });
  }

  try {
    await dbConnect();

    if (isStaticAdminLogin(email, password)) {
      const admin = await ensureStaticAdminUser();
      if (!admin) {
        return jsonEncrypted(
          aesKey,
          { success: false, error: "Admin is not configured (set ADMIN_EMAIL and ADMIN_PASSWORD)" },
          { status: 500 }
        );
      }
      return sessionResponse(aesKey, admin);
    }

    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user) {
      return jsonEncrypted(aesKey, { success: false, error: "Invalid email or password" }, { status: 401 });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return jsonEncrypted(aesKey, { success: false, error: "Invalid email or password" }, { status: 401 });
    }

    if (user.isRevoked) {
      return jsonEncrypted(aesKey, { success: false, error: "Your account access has been revoked" }, { status: 403 });
    }

    return sessionResponse(aesKey, user);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Login failed";
    return jsonEncrypted(aesKey, { success: false, error: message }, { status: 400 });
  }
}

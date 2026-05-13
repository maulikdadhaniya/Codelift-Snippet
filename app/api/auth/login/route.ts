import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { verifyPassword } from "@/lib/auth/password";
import { signSessionToken } from "@/lib/auth/jwt";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { readEncryptedPostBody, jsonEncrypted } from "@/lib/crypto/encrypted-post";

export const runtime = "nodejs";

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

    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user) {
      return jsonEncrypted(aesKey, { success: false, error: "Invalid email or password" }, { status: 401 });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return jsonEncrypted(aesKey, { success: false, error: "Invalid email or password" }, { status: 401 });
    }

    const firstName = user.firstName ?? "";
    const lastName = user.lastName ?? "";
    const profile = {
      firstName,
      lastName,
      ...(user.mobile ? { mobile: user.mobile } : {}),
    };
    const token = await signSessionToken(String(user._id), user.email, profile);

    const res = jsonEncrypted(aesKey, {
      success: true,
      user: {
        id: String(user._id),
        email: user.email,
        firstName,
        lastName,
        ...(user.mobile ? { mobile: user.mobile } : {}),
      },
    });

    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Login failed";
    return jsonEncrypted(aesKey, { success: false, error: message }, { status: 400 });
  }
}

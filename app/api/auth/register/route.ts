import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { hashPassword } from "@/lib/auth/password";
import { readEncryptedPostBody, jsonEncrypted } from "@/lib/crypto/encrypted-post";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^[+()\d][\d\s().-]{6,18}$/;

export async function POST(request: Request) {
  const parsed = await readEncryptedPostBody(request);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { aesKey, data } = parsed;
  const body = data as {
    email?: unknown;
    password?: unknown;
    confirmPassword?: unknown;
    firstName?: unknown;
    lastName?: unknown;
    mobile?: unknown;
  };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const mobileRaw = typeof body.mobile === "string" ? body.mobile.trim() : "";
  const mobile = mobileRaw === "" ? undefined : mobileRaw;

  if (!firstName) {
    return jsonEncrypted(aesKey, { success: false, error: "First name is required" }, { status: 400 });
  }
  if (!lastName) {
    return jsonEncrypted(aesKey, { success: false, error: "Last name is required" }, { status: 400 });
  }
  if (firstName.length > 80 || lastName.length > 80) {
    return jsonEncrypted(aesKey, { success: false, error: "Name is too long" }, { status: 400 });
  }
  if (mobile && (mobile.length > 20 || !MOBILE_RE.test(mobile))) {
    return jsonEncrypted(aesKey, { success: false, error: "Invalid mobile number" }, { status: 400 });
  }

  if (!EMAIL_RE.test(email)) {
    return jsonEncrypted(aesKey, { success: false, error: "Invalid email" }, { status: 400 });
  }
  if (password.length < 8) {
    return jsonEncrypted(
      aesKey,
      { success: false, error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }
  if (password !== confirmPassword) {
    return jsonEncrypted(aesKey, { success: false, error: "Passwords do not match" }, { status: 400 });
  }

  try {
    await dbConnect();

    const existing = await User.findOne({ email });
    if (existing) {
      return jsonEncrypted(aesKey, { success: false, error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    await User.create({
      email,
      firstName,
      lastName,
      ...(mobile ? { mobile } : {}),
      passwordHash,
    });

    return jsonEncrypted(aesKey, { success: true }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Registration failed";
    return jsonEncrypted(aesKey, { success: false, error: message }, { status: 400 });
  }
}

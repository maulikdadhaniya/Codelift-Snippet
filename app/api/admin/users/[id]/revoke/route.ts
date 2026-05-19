import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { requireAdminSession } from "@/lib/auth/admin";
import { getStaticAdminConfig } from "@/lib/auth/static-admin";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ success: false, error: "Invalid user id" }, { status: 400 });
  }

  if (id === auth.session.userId) {
    return NextResponse.json({ success: false, error: "You cannot revoke your own account" }, { status: 400 });
  }

  await dbConnect();

  const target = await User.findById(id).select("role isRevoked email").lean();
  if (!target) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  }

  if (target.role === "admin") {
    return NextResponse.json({ success: false, error: "Cannot revoke an admin account" }, { status: 400 });
  }

  const staticAdmin = getStaticAdminConfig();
  if (staticAdmin && target.email === staticAdmin.email) {
    return NextResponse.json({ success: false, error: "Cannot revoke the static admin account" }, { status: 400 });
  }

  if (target.isRevoked) {
    return NextResponse.json({ success: true, message: "User already revoked" });
  }

  await User.updateOne({ _id: id }, { isRevoked: true });

  return NextResponse.json({ success: true, message: "Access revoked" });
}

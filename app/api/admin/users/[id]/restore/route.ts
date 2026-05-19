import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { requireAdminSession } from "@/lib/auth/admin";

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

  await dbConnect();

  const target = await User.findById(id).select("isRevoked").lean();
  if (!target) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  }

  if (!target.isRevoked) {
    return NextResponse.json({ success: true, message: "User already active" });
  }

  await User.updateOne({ _id: id }, { isRevoked: false });

  return NextResponse.json({ success: true, message: "Access restored" });
}

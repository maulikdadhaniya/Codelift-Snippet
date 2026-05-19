import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Note from "@/models/Note";
import { requireAdminSession } from "@/lib/auth/admin";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  await dbConnect();

  const users = await User.find({})
    .select("email firstName lastName mobile role isRevoked createdAt")
    .sort({ createdAt: -1 })
    .lean();

  const noteCounts = await Note.aggregate<{ _id: unknown; count: number }>([
    { $group: { _id: "$user", count: { $sum: 1 } } },
  ]);

  const countByUser = new Map<string, number>();
  for (const row of noteCounts) {
    countByUser.set(String(row._id), row.count);
  }

  const data = users.map((u) => ({
    id: String(u._id),
    email: u.email,
    firstName: u.firstName ?? "",
    lastName: u.lastName ?? "",
    mobile: u.mobile ?? null,
    role: u.role === "admin" ? "admin" : "user",
    isRevoked: Boolean(u.isRevoked),
    noteCount: countByUser.get(String(u._id)) ?? 0,
    createdAt: u.createdAt,
  }));

  const stats = {
    totalUsers: data.length,
    activeUsers: data.filter((u) => !u.isRevoked).length,
    revokedUsers: data.filter((u) => u.isRevoked).length,
    totalNotes: data.reduce((sum, u) => sum + u.noteCount, 0),
  };

  return NextResponse.json({ success: true, stats, users: data });
}

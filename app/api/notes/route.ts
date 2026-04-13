import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Note from "@/models/Note";

export async function GET(request: Request) {
  try {
    await dbConnect();
    
    // Check if there is a search query
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    let query = {};
    if (search) {
      query = {
        $or: [
          { title: { $regex: search, $options: "i" } },
          { code: { $regex: search, $options: "i" } },
        ],
      };
    }

    const notes = await Note.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: notes });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const note = await Note.create(body);
    return NextResponse.json({ success: true, data: note }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

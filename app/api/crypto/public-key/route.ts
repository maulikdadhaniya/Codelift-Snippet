import { NextResponse } from "next/server";

export function GET() {
  const pem = process.env.RSA_PUBLIC_KEY_PEM?.replace(/\\n/g, "\n");
  if (!pem) {
    return NextResponse.json(
      { success: false, error: "RSA_PUBLIC_KEY_PEM is not configured" },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true, publicKeyPem: pem.trim() });
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    const res = NextResponse.json({ authenticated: false }, { status: 401 });
    // Hapus paksa session cookie yang sudah tidak sinkron dengan DB Neon
    res.cookies.set({
      name: "session_token",
      value: "",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });
    return res;
  }
  return NextResponse.json({ authenticated: true, user });
}
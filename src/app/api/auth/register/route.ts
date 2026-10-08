import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, signSession } from "@/lib/auth";
import { AccountType } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const { name, email, password, salaryDate } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Nama, email, dan password wajib diisi" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email sudah terdaftar, silakan login" }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    const parsedSalary = salaryDate ? parseInt(salaryDate) : 10;

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          profile: {
            create: {
              salaryDate: parsedSalary,
            },
          },
        },
      });

      await tx.account.createMany({
        data: [
          {
            name: "Bank Utama",
            type: AccountType.BANK,
            currency: "JPY",
            currentBalance: 0,
            userId: newUser.id,
          },
          {
            name: "Cash JPY",
            type: AccountType.CASH,
            currency: "JPY",
            currentBalance: 0,
            userId: newUser.id,
          },
        ],
      });

      return newUser;
    });

    const token = await signSession(user.id);
    const response = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email },
    });

    response.cookies.set({
      name: "session_token",
      value: token,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Register Error:", error);
    return NextResponse.json({ error: error.message || "Gagal registrasi" }, { status: 500 });
  }
}
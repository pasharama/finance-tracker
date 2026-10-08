import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userWithProfile = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      include: { profile: true },
    });

    if (!userWithProfile) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      name: userWithProfile.name,
      email: userWithProfile.email,
      avatarUrl: userWithProfile.profile?.avatarUrl || userWithProfile.image || null,
      salaryDate: userWithProfile.profile?.salaryDate ?? 10,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, avatarUrl, salaryDate } = body;

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: sessionUser.id },
        data: {
          name: name ? String(name).trim() : undefined,
        },
      });

      const profile = await tx.profile.upsert({
        where: { userId: sessionUser.id },
        create: {
          userId: sessionUser.id,
          avatarUrl: avatarUrl || null,
          salaryDate: salaryDate !== undefined ? Number(salaryDate) : 10,
        },
        update: {
          avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
          salaryDate: salaryDate !== undefined ? Number(salaryDate) : undefined,
        },
      });

      return { user, profile };
    });

    return NextResponse.json({
      success: true,
      data: {
        name: updated.user.name,
        email: updated.user.email,
        avatarUrl: updated.profile.avatarUrl,
        salaryDate: updated.profile.salaryDate,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
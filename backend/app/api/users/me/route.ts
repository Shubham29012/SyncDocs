import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";
import { UpdateUserSchema, ChangePasswordSchema } from "@/lib/validations";

export const runtime = "nodejs";

// GET /api/users/me
export const GET = withAuth(async (_req, { session }) => {
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
      _count: {
        select: {
          ownedDocuments: { where: { isDeleted: false, isArchived: false } },
          collaborations: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
});

// PATCH /api/users/me
export const PATCH = withAuth(async (req, { session }) => {
  const body = await req.json();
  const parsed = UpdateUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: parsed.data,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  });

  return NextResponse.json({ user });
});

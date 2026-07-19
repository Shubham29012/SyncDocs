import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";

export const runtime = "nodejs";

// PATCH /api/notifications/:id/read — Mark single notification as read
export const PATCH = withAuth(async (_req: NextRequest, { params, session }: any) => {
  const notification = await prisma.notification.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!notification) {
    return NextResponse.json(
      { error: "Notification not found" },
      { status: 404 }
    );
  }

  await prisma.notification.update({
    where: { id: params.id },
    data: { isRead: true },
  });

  return NextResponse.json({ message: "Notification marked as read" });
});

// DELETE /api/notifications/:id — Delete notification
export const DELETE = withAuth(async (_req: NextRequest, { params, session }: any) => {
  const notification = await prisma.notification.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!notification) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }

  await prisma.notification.delete({ where: { id: params.id } });

  return NextResponse.json({ message: "Notification deleted" });
});

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";

export const runtime = "nodejs";

// GET /api/notifications — List unread notifications for current user
export const GET = withAuth(async (req: NextRequest, { session }: any) => {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const unreadOnly = searchParams.get("unread") !== "false";

  const where: any = { userId: session.user.id };
  if (unreadOnly) {
    where.isRead = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        isRead: true,
        createdAt: true,
        documentId: true,
        document: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: session.user.id, isRead: false } }),
  ]);

  return NextResponse.json({ notifications, total, unreadCount, limit, offset });
});

// PATCH /api/notifications — Mark all as read
export const PATCH = withAuth(async (_req: NextRequest, { session }: any) => {
  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json({ message: "All notifications marked as read" });
});

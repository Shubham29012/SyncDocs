import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRole } from "@/lib/middleware";
import { Role } from "@prisma/client";

export const runtime = "nodejs";

// GET /api/documents/:id/activity — Paginated activity log
export const GET = withRole(Role.VIEWER)(async (req: NextRequest, { params }: any) => {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const action = searchParams.get("action"); // optional filter

  const where: any = { documentId: params.id };
  if (action) {
    where.action = action;
  }

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      select: {
        id: true,
        action: true,
        metadata: true,
        timestamp: true,
        user: { select: { id: true, name: true, image: true } },
      },
      orderBy: { timestamp: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.activityLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total, limit, offset });
});

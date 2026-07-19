import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRole } from "@/lib/middleware";
import { Role } from "@prisma/client";

export const runtime = "nodejs";

// POST /api/documents/:id/duplicate
export const POST = withRole(Role.VIEWER)(async (req, { params, session }) => {
  const original = await prisma.document.findFirst({
    where: { id: params.id, isDeleted: false },
  });

  if (!original) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Create duplicate
  const duplicate = await prisma.document.create({
    data: {
      title: `${original.title} (Copy)`,
      ownerId: session.user.id,
      content: original.content,
      yjsState: original.yjsState,
    },
    select: {
      id: true,
      title: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      documentId: duplicate.id,
      userId: session.user.id,
      action: "CREATED",
      metadata: { duplicatedFrom: original.id },
    },
  });

  return NextResponse.json({ document: duplicate });
});

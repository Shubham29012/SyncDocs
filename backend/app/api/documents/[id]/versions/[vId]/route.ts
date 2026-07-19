import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRole } from "@/lib/middleware";
import { Role } from "@prisma/client";

export const runtime = "nodejs";

// GET /api/documents/:id/versions/:vId — Get version details + diff preview
export const GET = withRole(Role.VIEWER)(async (_req: NextRequest, { params }: any) => {
  const version = await prisma.version.findFirst({
    where: { id: params.vId, documentId: params.id },
    select: {
      id: true,
      label: true,
      textContent: true,
      snapshot: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true, image: true } },
    },
  });

  if (!version) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  // Return snapshot as base64 for client-side diff rendering
  return NextResponse.json({
    version: {
      ...version,
      snapshot: Buffer.from(version.snapshot).toString("base64"),
    },
  });
});

// DELETE /api/documents/:id/versions/:vId — Delete snapshot (owner only)
export const DELETE = withRole(Role.OWNER)(async (_req: NextRequest, { params, session }: any) => {
  // Verify this version belongs to a document the user owns
  const version = await prisma.version.findFirst({
    where: {
      id: params.vId,
      documentId: params.id,
      document: { ownerId: session.user.id },
    },
  });

  if (!version) {
    return NextResponse.json(
      { error: "Version not found or access denied" },
      { status: 404 }
    );
  }

  await prisma.version.delete({ where: { id: params.vId } });

  return NextResponse.json({ message: "Version deleted" });
});

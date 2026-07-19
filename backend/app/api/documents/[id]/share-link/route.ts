import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRole } from "@/lib/middleware";
import { Role } from "@prisma/client";
import crypto from "crypto";

export const runtime = "nodejs";

// GET /api/documents/:id/share-link — Generate or retrieve share token (owner only)
export const GET = withRole(Role.OWNER)(async (_req, { params, session }) => {
  // Verify ownership
  const doc = await prisma.document.findFirst({
    where: { id: params.id, ownerId: session.user.id, isDeleted: false },
    select: { id: true, shareToken: true, title: true },
  });

  if (!doc) {
    return NextResponse.json(
      { error: "Document not found or access denied" },
      { status: 404 }
    );
  }

  // Reuse existing token or generate a new one
  let shareToken = doc.shareToken;
  if (!shareToken) {
    shareToken = crypto.randomBytes(32).toString("hex");
    await prisma.document.update({
      where: { id: params.id },
      data: { shareToken },
    });
  }

  const shareUrl = `${process.env.FRONTEND_URL ?? "http://localhost:3001"}/documents/share/${shareToken}`;

  return NextResponse.json({ shareToken, shareUrl, title: doc.title });
});

// DELETE /api/documents/:id/share-link — Revoke share link (owner only)
export const DELETE = withRole(Role.OWNER)(async (_req, { params, session }) => {
  const doc = await prisma.document.findFirst({
    where: { id: params.id, ownerId: session.user.id },
  });
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  await prisma.document.update({
    where: { id: params.id },
    data: { shareToken: null },
  });

  return NextResponse.json({ message: "Share link revoked" });
});

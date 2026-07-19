import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, withRole } from "@/lib/middleware";
import { UpdateDocumentSchema } from "@/lib/validations";
import { Role } from "@prisma/client";
import crypto from "crypto";

export const runtime = "nodejs";

// GET /api/documents/:id
export const GET = withRole(Role.VIEWER)(async (req, { params, session }) => {
  const document = await prisma.document.findFirst({
    where: { id: params.id, isDeleted: false },
    select: {
      id: true,
      title: true,
      ownerId: true,
      isArchived: true,
      isStarred: true,
      yjsState: true, // Binary Yjs state
      shareToken: true,
      createdAt: true,
      updatedAt: true,
      owner: { select: { id: true, name: true, image: true } },
      collaborators: {
        select: {
          role: true,
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
      _count: { select: { versions: true } },
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Convert binary Yjs state to base64 for JSON transport
  const yjsStateBase64 = document.yjsState
    ? Buffer.from(document.yjsState).toString("base64")
    : null;

  const myCollaboration = document.collaborators.find(
    (c) => c.user.id === session.user.id
  );
  const myRole =
    document.ownerId === session.user.id ? "OWNER" : myCollaboration?.role ?? "VIEWER";

  return NextResponse.json({
    document: {
      ...document,
      yjsState: yjsStateBase64,
      myRole,
    },
  });
});

// PATCH /api/documents/:id
export const PATCH = withRole(Role.EDITOR)(async (req, { params, session }) => {
  const body = await req.json();
  const parsed = UpdateDocumentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Only owners can archive/unarchive
  if (parsed.data.isArchived !== undefined && params._userRole !== "OWNER") {
    // Check if they're owner via DB
    const doc = await prisma.document.findFirst({
      where: { id: params.id, ownerId: session.user.id },
    });
    if (!doc) {
      return NextResponse.json(
        { error: "Only owners can archive documents" },
        { status: 403 }
      );
    }
  }

  const document = await prisma.document.update({
    where: { id: params.id },
    data: parsed.data,
    select: { id: true, title: true, isArchived: true, isStarred: true, updatedAt: true },
  });

  // Log activity
  if (parsed.data.title) {
    await prisma.activityLog.create({
      data: {
        documentId: params.id,
        userId: session.user.id,
        action: "RENAMED",
        metadata: { newTitle: parsed.data.title },
      },
    });
  }

  return NextResponse.json({ document });
});

// DELETE /api/documents/:id (soft delete — owner only)
export const DELETE = withRole(Role.OWNER)(async (req, { params, session }) => {
  // Verify owner
  const doc = await prisma.document.findFirst({
    where: { id: params.id, ownerId: session.user.id },
  });

  if (!doc) {
    return NextResponse.json(
      { error: "Only the document owner can delete it" },
      { status: 403 }
    );
  }

  await prisma.document.update({
    where: { id: params.id },
    data: { isDeleted: true },
  });

  return NextResponse.json({ message: "Document deleted successfully" });
});

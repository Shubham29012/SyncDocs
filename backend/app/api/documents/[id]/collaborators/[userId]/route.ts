import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRole } from "@/lib/middleware";
import { UpdateCollaboratorSchema } from "@/lib/validations";
import { Role } from "@prisma/client";

export const runtime = "nodejs";

// PATCH /api/documents/:id/collaborators/:userId — Change role (owner only)
export const PATCH = withRole(Role.OWNER)(async (req, { params, session }) => {
  const body = await req.json();
  const parsed = UpdateCollaboratorSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Verify ownership
  const doc = await prisma.document.findFirst({
    where: { id: params.id, ownerId: session.user.id },
  });
  if (!doc) {
    return NextResponse.json({ error: "Only owners can change roles" }, { status: 403 });
  }

  const collaborator = await prisma.collaborator.update({
    where: {
      documentId_userId: {
        documentId: params.id,
        userId: params.userId,
      },
    },
    data: { role: parsed.data.role },
    select: {
      id: true,
      role: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  // Notify user of role change
  await prisma.notification.create({
    data: {
      userId: params.userId,
      documentId: params.id,
      type: "ROLE_UPDATED",
      title: "Your document role was updated",
      message: `Your role in "${doc.title}" has been changed to ${parsed.data.role}`,
    },
  });

  await prisma.activityLog.create({
    data: {
      documentId: params.id,
      userId: session.user.id,
      action: "ROLE_CHANGED",
      metadata: { targetUserId: params.userId, newRole: parsed.data.role },
    },
  });

  return NextResponse.json({ collaborator });
});

// DELETE /api/documents/:id/collaborators/:userId — Remove collaborator (owner only)
export const DELETE = withRole(Role.OWNER)(async (req, { params, session }) => {
  const doc = await prisma.document.findFirst({
    where: { id: params.id, ownerId: session.user.id },
  });
  if (!doc) {
    return NextResponse.json({ error: "Only owners can remove collaborators" }, { status: 403 });
  }

  await prisma.collaborator.delete({
    where: {
      documentId_userId: {
        documentId: params.id,
        userId: params.userId,
      },
    },
  });

  return NextResponse.json({ message: "Collaborator removed" });
});

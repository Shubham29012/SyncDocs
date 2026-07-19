import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRole } from "@/lib/middleware";
import { InviteCollaboratorSchema, UpdateCollaboratorSchema } from "@/lib/validations";
import { Role } from "@prisma/client";

export const runtime = "nodejs";

// GET /api/documents/:id/collaborators
export const GET = withRole(Role.VIEWER)(async (_req, { params }) => {
  const collaborators = await prisma.collaborator.findMany({
    where: { documentId: params.id },
    select: {
      id: true,
      role: true,
      invitedAt: true,
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { invitedAt: "asc" },
  });

  // Also include owner
  const document = await prisma.document.findUnique({
    where: { id: params.id },
    select: { owner: { select: { id: true, name: true, email: true, image: true } } },
  });

  return NextResponse.json({
    owner: document?.owner,
    collaborators,
  });
});

// POST /api/documents/:id/collaborators — Invite by email (owner only)
export const POST = withRole(Role.OWNER)(async (req, { params, session }) => {
  const body = await req.json();
  const parsed = InviteCollaboratorSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Must be owner
  const doc = await prisma.document.findFirst({
    where: { id: params.id, ownerId: session.user.id },
  });
  if (!doc) {
    return NextResponse.json({ error: "Only owners can invite collaborators" }, { status: 403 });
  }

  // Find user by email
  const invitee = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, name: true, email: true },
  });

  if (!invitee) {
    return NextResponse.json(
      { error: "No user found with that email address" },
      { status: 404 }
    );
  }

  if (invitee.id === session.user.id) {
    return NextResponse.json(
      { error: "You cannot invite yourself" },
      { status: 400 }
    );
  }

  // Upsert collaborator
  const collaborator = await prisma.collaborator.upsert({
    where: { documentId_userId: { documentId: params.id, userId: invitee.id } },
    update: { role: parsed.data.role },
    create: {
      documentId: params.id,
      userId: invitee.id,
      role: parsed.data.role,
    },
    select: {
      id: true,
      role: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  // Create notification
  await prisma.notification.create({
    data: {
      userId: invitee.id,
      documentId: params.id,
      type: "DOCUMENT_SHARED",
      title: "You've been invited to a document",
      message: `You now have ${parsed.data.role} access to "${doc.title}"`,
    },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      documentId: params.id,
      userId: session.user.id,
      action: "SHARED",
      metadata: { collaboratorEmail: parsed.data.email, role: parsed.data.role },
    },
  });

  return NextResponse.json({ collaborator }, { status: 201 });
});

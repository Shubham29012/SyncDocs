import { z } from "zod";

// ============================================================
// AUTH SCHEMAS
// ============================================================

export const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase, and a number"
    ),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

// ============================================================
// USER SCHEMAS
// ============================================================

export const UpdateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  image: z.string().url().optional().nullable(),
});

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z
      .string()
      .min(8)
      .max(128)
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// ============================================================
// DOCUMENT SCHEMAS
// ============================================================

export const CreateDocumentSchema = z.object({
  title: z.string().min(1, "Title required").max(255).default("Untitled Document"),
});

export const UpdateDocumentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  isArchived: z.boolean().optional(),
  isStarred: z.boolean().optional(),
});

// ============================================================
// COLLABORATOR SCHEMAS
// ============================================================

export const InviteCollaboratorSchema = z.object({
  email: z.string().email("Invalid email"),
  role: z.enum(["EDITOR", "VIEWER"]),
});

export const UpdateCollaboratorSchema = z.object({
  role: z.enum(["EDITOR", "VIEWER"]),
});

// ============================================================
// SYNC SCHEMAS (Critical — prevents OOM attacks)
// ============================================================

export const SyncPushSchema = z.object({
  documentId: z.string().cuid(),
  // Base64-encoded Yjs update — strict max to prevent payload attacks
  update: z
    .string()
    .max(500_000, "Sync payload too large (max 500KB per operation)")
    .regex(/^[A-Za-z0-9+/=]+$/, "Invalid base64 encoding"),
  clientId: z.string().max(64),
  timestamp: z.number().int().positive(),
});

export const SyncPullSchema = z.object({
  documentId: z.string().cuid(),
  // State vector from client to compute diff
  stateVector: z
    .string()
    .max(10_000, "State vector too large")
    .regex(/^[A-Za-z0-9+/=]*$/)
    .optional(),
});

// ============================================================
// VERSION SCHEMAS
// ============================================================

export const CreateVersionSchema = z.object({
  documentId: z.string().cuid(),
  label: z.string().min(1).max(100).optional().default("Snapshot"),
});

// ============================================================
// AI SCHEMAS
// ============================================================

export const AIRequestSchema = z.object({
  documentId: z.string().cuid(),
  text: z
    .string()
    .min(1, "Text is required")
    .max(10_000, "Text too long (max 10,000 characters)"),
  targetLanguage: z.string().max(50).optional(), // for translate
});

// ============================================================
// SEARCH SCHEMAS
// ============================================================

export const SearchSchema = z.object({
  q: z.string().min(1).max(200),
  type: z.enum(["title", "content", "all"]).default("all"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ============================================================
// NOTIFICATION SCHEMAS
// ============================================================

export const NotificationCreateSchema = z.object({
  userId: z.string().cuid(),
  documentId: z.string().cuid().optional(),
  type: z.enum([
    "DOCUMENT_SHARED",
    "ROLE_UPDATED",
    "SYNC_FAILED",
    "SYNC_COMPLETED",
  ]),
  title: z.string().max(200),
  message: z.string().max(500),
});

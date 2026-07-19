import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRole } from "@/lib/middleware";
import { AIRequestSchema } from "@/lib/validations";
import { Role } from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

type AIAction =
  | "summarize"
  | "rewrite"
  | "grammar"
  | "translate"
  | "continue"
  | "meeting-notes";

const VIEWER_ACTIONS: AIAction[] = ["summarize"];
const EDITOR_ACTIONS: AIAction[] = [
  "rewrite",
  "grammar",
  "translate",
  "continue",
  "meeting-notes",
];

function buildPrompt(action: AIAction, text: string, targetLanguage?: string): string {
  switch (action) {
    case "summarize":
      return `Summarize the following text concisely in 2-3 sentences:\n\n${text}`;
    case "rewrite":
      return `Rewrite the following text to improve clarity and flow while preserving the meaning:\n\n${text}`;
    case "grammar":
      return `Fix all grammar, spelling, and punctuation errors in the following text. Return only the corrected text, no explanations:\n\n${text}`;
    case "translate":
      const lang = targetLanguage ?? "Spanish";
      return `Translate the following text to ${lang}. Return only the translation, no explanations:\n\n${text}`;
    case "continue":
      return `Continue writing the following text naturally, adding 2-3 more sentences that fit the style and context:\n\n${text}`;
    case "meeting-notes":
      return `Convert the following raw meeting transcript or notes into structured meeting notes with: Summary, Action Items, and Key Decisions sections:\n\n${text}`;
    default:
      throw new Error("Unknown AI action");
  }
}

/**
 * POST /api/ai/[action]
 *
 * Supported actions: summarize, rewrite, grammar, translate, continue, meeting-notes
 * Uses Gemini 1.5 Flash (free tier: 15 RPM)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  const unwrappedParams = await params;
  const action = unwrappedParams.action as AIAction;

  const allActions = [...VIEWER_ACTIONS, ...EDITOR_ACTIONS];
  if (!allActions.includes(action)) {
    return NextResponse.json(
      { error: `Unknown AI action: ${action}` },
      { status: 400 }
    );
  }

  // Clone request to extract documentId from body before passing to middleware
  const reqClone = req.clone();
  let documentId = "";
  try {
    const body = await req.json();
    documentId = body?.documentId;
  } catch (err) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!documentId) {
    return NextResponse.json({ error: "documentId is required" }, { status: 400 });
  }

  // Determine required role based on action
  const requiredRole = VIEWER_ACTIONS.includes(action) ? Role.VIEWER : Role.EDITOR;

  // Use withRole middleware inline
  const handler = withRole(requiredRole)(async (innerReq, { session }: any) => {
    const body = await innerReq.json();
    const parsed = AIRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { text, targetLanguage } = parsed.data;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: action === "rewrite" || action === "continue" ? 0.7 : 0.2,
        },
      });

      const prompt = buildPrompt(action, text, targetLanguage);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const output = response.text();

      // Log AI usage
      await prisma.activityLog.create({
        data: {
          documentId: parsed.data.documentId,
          userId: session.user.id,
          action: "AI_USED",
          metadata: { aiAction: action, inputLength: text.length },
        },
      });

      return NextResponse.json({
        result: output,
        action,
        inputLength: text.length,
        outputLength: output.length,
      });
    } catch (err: any) {
      console.error(`[AI/${action}] Gemini error:`, err);

      // Handle rate limit errors gracefully
      if (err?.status === 429) {
        return NextResponse.json(
          { error: "AI rate limit reached. Please wait a moment and try again." },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: "AI generation failed. Please try again." },
        { status: 500 }
      );
    }
  });

  // Reconstruct params to match withRole's expected context
  return handler(reqClone, { params: { id: documentId } } as any);
}

"use client";

import { useCallback } from "react";
import { aiApi } from "@/lib/api/client";
import type { AIResponse } from "@/types";
import toast from "react-hot-toast";

type AIAction = "summarize" | "rewrite" | "grammar" | "translate" | "continue" | "meeting-notes";

interface UseAIOptions {
  documentId: string;
}

export function useAI({ documentId }: UseAIOptions) {
  const run = useCallback(
    async (
      action: AIAction,
      text: string,
      targetLanguage?: string
    ): Promise<AIResponse | null> => {
      if (!text.trim()) {
        toast.error("Please select some text first");
        return null;
      }

      const toastId = toast.loading(`Running ${action}…`);

      try {
        const result = await aiApi.run(action, {
          documentId,
          text,
          targetLanguage,
        });
        toast.success(`${action} complete`, { id: toastId });
        return result;
      } catch (err: any) {
        const message =
          err?.status === 429
            ? "AI rate limit reached. Try again in a moment."
            : err?.body?.error ?? "AI generation failed";
        toast.error(message, { id: toastId });
        return null;
      }
    },
    [documentId]
  );

  return {
    summarize: (text: string) => run("summarize", text),
    rewrite: (text: string) => run("rewrite", text),
    fixGrammar: (text: string) => run("grammar", text),
    translate: (text: string, targetLanguage: string) => run("translate", text, targetLanguage),
    continueWriting: (text: string) => run("continue", text),
    generateMeetingNotes: (text: string) => run("meeting-notes", text),
  };
}

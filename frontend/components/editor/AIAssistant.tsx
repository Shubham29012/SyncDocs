"use client";

import type { Editor } from "@tiptap/react";
import { useState } from "react";
import { useAI } from "@/features/ai/useAI";

type AIAction = "summarize" | "rewrite" | "grammar" | "translate" | "continue" | "meeting-notes";

const actions: { id: AIAction; label: string; icon: string; desc: string; editorOnly?: boolean }[] = [
  { id: "summarize",     label: "Summarize",       icon: "📝", desc: "Condense selection into 2-3 sentences" },
  { id: "rewrite",      label: "Rewrite",          icon: "✏️", desc: "Improve clarity and flow",       editorOnly: true },
  { id: "grammar",      label: "Fix Grammar",       icon: "🔤", desc: "Fix spelling & grammar errors",  editorOnly: true },
  { id: "translate",    label: "Translate",         icon: "🌐", desc: "Translate to another language",  editorOnly: true },
  { id: "continue",     label: "Continue Writing",  icon: "➡️", desc: "Add 2-3 more sentences",        editorOnly: true },
  { id: "meeting-notes",label: "Meeting Notes",     icon: "📋", desc: "Format as structured notes",    editorOnly: true },
];

interface AIAssistantProps {
  editor: Editor;
  docId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AIAssistant({ editor, docId, isOpen, onClose }: AIAssistantProps) {
  const [result, setResult] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<AIAction | null>(null);
  const [targetLang, setTargetLang] = useState("Spanish");
  const [loading, setLoading] = useState(false);
  const ai = useAI({ documentId: docId });

  const getSelectedText = () => {
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, " ").trim();
  };

  const runAction = async (action: AIAction) => {
    const text = getSelectedText() || editor.getText().slice(0, 5000);
    if (!text) return;

    setActiveAction(action);
    setLoading(true);
    setResult(null);

    let res = null;
    if (action === "translate") res = await ai.translate(text, targetLang);
    else if (action === "summarize") res = await ai.summarize(text);
    else if (action === "rewrite") res = await ai.rewrite(text);
    else if (action === "grammar") res = await ai.fixGrammar(text);
    else if (action === "continue") res = await ai.continueWriting(text);
    else if (action === "meeting-notes") res = await ai.generateMeetingNotes(text);

    setResult(res?.result ?? null);
    setLoading(false);
  };

  const handleInsert = () => {
    if (!result) return;
    const { from, to } = editor.state.selection;
    if (from !== to) {
      editor.chain().focus().deleteSelection().insertContent(result).run();
    } else {
      editor.chain().focus().insertContent("\n" + result).run();
    }
    setResult(null);
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
    }
  };

  return (
    <div className={`ai-panel ${isOpen ? "open" : ""}`} aria-label="AI Assistant panel">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-primary)" }}>
            ⚡ AI Assistant
          </h3>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
            Select text or use full document
          </p>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close AI panel">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {actions.map((action) => (
          <button
            key={action.id}
            id={`ai-${action.id}-btn`}
            className="glass-card"
            style={{
              padding: "12px 16px",
              textAlign: "left",
              display: "flex",
              gap: "12px",
              alignItems: "flex-start",
              cursor: "pointer",
              border: activeAction === action.id ? "1px solid var(--accent)" : undefined,
              background: activeAction === action.id ? "var(--accent-dim)" : undefined,
            }}
            onClick={() => runAction(action.id)}
            disabled={loading}
          >
            <span style={{ fontSize: "1.2rem" }}>{action.icon}</span>
            <div>
              <p style={{ fontSize: "0.875rem", fontWeight: "600", marginBottom: "2px" }}>{action.label}</p>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{action.desc}</p>
            </div>
            {loading && activeAction === action.id && (
              <span className="spinner" style={{ width: "14px", height: "14px", marginLeft: "auto", flexShrink: 0 }} />
            )}
          </button>
        ))}

        {/* Translate language selector */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
          <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
            Translate to:
          </label>
          <input
            className="input"
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            placeholder="Spanish, French…"
            style={{ fontSize: "0.8rem", padding: "6px 10px" }}
          />
        </div>
      </div>

      {result && (
        <div style={{ marginTop: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <p style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-secondary)" }}>Result</p>
            <div style={{ display: "flex", gap: "6px" }}>
              <button className="btn btn-secondary btn-sm" onClick={handleCopy}>Copy</button>
              <button className="btn btn-primary btn-sm" onClick={handleInsert}>Insert</button>
            </div>
          </div>
          <div className="ai-result">{result}</div>
        </div>
      )}
    </div>
  );
}

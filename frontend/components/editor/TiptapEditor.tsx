"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TextAlign from "@tiptap/extension-text-align";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import EditorToolbar from "./EditorToolbar";
import { YjsProvider } from "@/features/collaboration/YjsProvider";
import { updateDocumentYjsState, getDocument } from "@/lib/db/dexie";
import { syncEngine } from "@/features/sync/SyncEngine";

interface TiptapEditorProps {
  docId: string;
  initialYjsState?: Uint8Array | null;
  editable?: boolean;
  onWordCount?: (count: number) => void;
}

export default function TiptapEditor({
  docId,
  initialYjsState,
  editable = true,
  onWordCount,
}: TiptapEditorProps) {
  const { data: session } = useSession();
  const [provider, setProvider] = useState<YjsProvider | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    let active = true;
    let localProvider: YjsProvider | null = null;

    const init = async () => {
      const localDoc = await getDocument(docId);
      if (!active) return;

      localProvider = new YjsProvider({
        docId,
        userId: session.user.id!,
        userName: session.user.name ?? "Anonymous",
        userImage: session.user.image ?? undefined,
        initialState: localDoc?.yjsState ?? initialYjsState,
        onUpdate: (update) => {
          updateDocumentYjsState(docId, update, Date.now());
          syncEngine.enqueue(docId, update);
        },
      });

      setProvider(localProvider);
    };

    init();

    return () => {
      active = false;
      if (localProvider) {
        localProvider.destroy();
      }
    };
  }, [docId, session, initialYjsState]);

  if (!provider || !session?.user) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="spinner" style={{ width: "24px", height: "24px" }} />
      </div>
    );
  }

  return (
    <TiptapEditorInner
      docId={docId}
      provider={provider}
      session={session}
      editable={editable}
      onWordCount={onWordCount}
    />
  );
}

interface TiptapEditorInnerProps {
  docId: string;
  provider: YjsProvider;
  session: any;
  editable?: boolean;
  onWordCount?: (count: number) => void;
}

function TiptapEditorInner({
  docId,
  provider,
  session,
  editable = true,
  onWordCount,
}: TiptapEditorInnerProps) {
  const extensions = [
    StarterKit.configure({
      history: false,
    }),
    Collaboration.configure({
      document: provider.ydoc,
    }),
    Placeholder.configure({ placeholder: "Start writing… or press / for commands" }),
    CharacterCount,
    Highlight.configure({ multicolor: true }),
    Link.configure({ openOnClick: false }),
    Underline,
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: true }),
    TableRow,
    TableCell,
    TableHeader,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
  ];

  if (provider.provider) {
    extensions.push(
      CollaborationCaret.configure({
        provider: provider.provider,
        user: {
          name: session.user.name ?? "Anonymous",
          color: provider.color,
        },
      })
    );
  }

  const editor = useEditor({
    extensions,
    editable,
    editorProps: {
      attributes: {
        class: "ProseMirror",
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      onWordCount?.(text.split(/\s+/).filter(Boolean).length);
    },
  }, [provider]);

  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  if (!editor) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="spinner" style={{ width: "24px", height: "24px" }} />
      </div>
    );
  }

  return (
    <div className="editor-container">
      {editable && <EditorToolbar editor={editor} docId={docId} />}
      <div className="tiptap-editor">
        <EditorContent editor={editor} />
      </div>
      <div
        style={{
          position: "fixed",
          bottom: "16px",
          right: "16px",
          fontSize: "0.72rem",
          color: "var(--text-muted)",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          padding: "4px 10px",
          borderRadius: "20px",
        }}
      >
        {editor.storage.characterCount?.words?.() ?? 0} words
      </div>
    </div>
  );
}

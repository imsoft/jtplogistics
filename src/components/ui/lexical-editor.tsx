"use client";

import { useEffect, useCallback } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import {
  FORMAT_TEXT_COMMAND,
  $getSelection,
  $isRangeSelection,
  UNDO_COMMAND,
  REDO_COMMAND,
  type EditorState,
  type LexicalEditor as LexicalEditorInstance,
} from "lexical";
import { $setBlocksType } from "@lexical/selection";
import { HeadingNode, $createHeadingNode } from "@lexical/rich-text";
import { ListNode, ListItemNode, INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND } from "@lexical/list";
import {
  Bold, Italic, Underline, List, ListOrdered, Heading3, Undo2, Redo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Toolbar ────────────────────────────────────────────────────────────────

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();

  const fmt = useCallback((f: "bold" | "italic" | "underline") => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, f);
  }, [editor]);

  const heading = useCallback(() => {
    editor.update(() => {
      const sel = $getSelection();
      if ($isRangeSelection(sel)) {
        $setBlocksType(sel, () => $createHeadingNode("h3"));
      }
    });
  }, [editor]);

  return (
    <div className="flex flex-wrap gap-1 border-b bg-muted/40 px-2 py-1.5 rounded-t-md">
      <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => fmt("bold")} title="Negrita (Ctrl+B)">
        <Bold className="size-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => fmt("italic")} title="Cursiva (Ctrl+I)">
        <Italic className="size-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => fmt("underline")} title="Subrayado (Ctrl+U)">
        <Underline className="size-3.5" />
      </Button>
      <div className="h-5 w-px bg-border mx-1 self-center" />
      <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)} title="Lista con viñetas">
        <List className="size-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)} title="Lista numerada">
        <ListOrdered className="size-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="size-7" onClick={heading} title="Encabezado H3">
        <Heading3 className="size-3.5" />
      </Button>
      <div className="h-5 w-px bg-border mx-1 self-center" />
      <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} title="Deshacer">
        <Undo2 className="size-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} title="Rehacer">
        <Redo2 className="size-3.5" />
      </Button>
    </div>
  );
}

// ── Load initial state ────────────────────────────────────────────────────

function InitialStatePlugin({ json }: { json: string }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!json) return;
    try {
      const state = editor.parseEditorState(json);
      editor.setEditorState(state);
    } catch { /* ignore parse errors */ }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// ── Public component ─────────────────────────────────────────────────────

interface LexicalEditorProps {
  value: string;
  onChange: (json: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
}

const theme = {
  paragraph: "mb-2 leading-relaxed",
  text: {
    bold: "font-bold",
    italic: "italic",
    underline: "underline",
    underlineStrikethrough: "underline line-through",
    strikethrough: "line-through",
  },
  list: {
    ul: "list-disc pl-5 mb-2 space-y-1",
    ol: "list-decimal pl-5 mb-2 space-y-1",
    listitem: "leading-relaxed",
  },
  heading: {
    h1: "text-xl font-bold mb-2",
    h2: "text-lg font-bold mb-2",
    h3: "text-base font-semibold mb-1",
  },
};

export function LexicalEditor({ value, onChange, placeholder = "Escribe aquí…", minHeight = 300, className }: LexicalEditorProps) {
  function handleChange(state: EditorState, _editor: LexicalEditorInstance) {
    onChange(JSON.stringify(state.toJSON()));
  }

  const initialConfig = {
    namespace: "QuoteTermsEditor",
    nodes: [HeadingNode, ListNode, ListItemNode],
    theme,
    onError: (e: Error) => console.error(e),
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={cn("rounded-md border bg-background text-sm", className)}>
        <ToolbarPlugin />
        <div className="relative px-3 py-2" style={{ minHeight }}>
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="outline-none min-h-[inherit] focus:outline-none" />
            }
            placeholder={
              <div className="pointer-events-none absolute top-2 left-3 text-muted-foreground select-none">
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
      </div>
      <HistoryPlugin />
      <ListPlugin />
      <OnChangePlugin onChange={handleChange} />
      <InitialStatePlugin json={value} />
    </LexicalComposer>
  );
}

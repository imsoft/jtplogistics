/**
 * Render de solo lectura del contenido de Lexical guardado en `contentJson`.
 * Es un módulo sin "use client" para poder usarse también desde el servidor.
 */

import React from "react";

const IS_BOLD = 1;
const IS_ITALIC = 2;
const IS_UNDERLINE = 8;
const IS_STRIKETHROUGH = 4;

interface LexNode {
  type: string;
  format?: number | string;
  text?: string;
  tag?: string;
  listType?: string;
  value?: number;
  children?: LexNode[];
}

function renderInline(node: LexNode, key: number): React.ReactNode {
  if (node.type === "linebreak") return <br key={key} />;
  if (node.type !== "text") {
    return <React.Fragment key={key}>{(node.children ?? []).map(renderInline)}</React.Fragment>;
  }

  const fmt = typeof node.format === "number" ? node.format : 0;
  let content: React.ReactNode = node.text;
  if (fmt & IS_BOLD) content = <strong>{content}</strong>;
  if (fmt & IS_ITALIC) content = <em>{content}</em>;
  if (fmt & IS_UNDERLINE) content = <u>{content}</u>;
  if (fmt & IS_STRIKETHROUGH) content = <s>{content}</s>;

  return <React.Fragment key={key}>{content}</React.Fragment>;
}

function renderBlock(node: LexNode, key: number): React.ReactNode {
  const children = (node.children ?? []).map(renderInline);

  switch (node.type) {
    case "paragraph":
      return (
        <p key={key} className="mb-3 leading-relaxed">
          {children.length > 0 ? children : <br />}
        </p>
      );

    case "heading": {
      const className = "mb-2 mt-5 font-semibold text-foreground";
      if (node.tag === "h1") return <h2 key={key} className={`${className} text-xl`}>{children}</h2>;
      if (node.tag === "h2") return <h3 key={key} className={`${className} text-lg`}>{children}</h3>;
      return <h4 key={key} className={`${className} text-base`}>{children}</h4>;
    }

    case "list": {
      const items = (node.children ?? []).map((item, i) => (
        <li key={i} className="leading-relaxed">
          {(item.children ?? []).map(renderInline)}
        </li>
      ));
      return node.listType === "number" ? (
        <ol key={key} className="mb-3 list-decimal space-y-1 pl-5">{items}</ol>
      ) : (
        <ul key={key} className="mb-3 list-disc space-y-1 pl-5">{items}</ul>
      );
    }

    case "quote":
      return (
        <blockquote key={key} className="mb-3 border-l-2 pl-4 italic text-muted-foreground">
          {children}
        </blockquote>
      );

    default:
      return null;
  }
}

/** Convierte el estado de Lexical a texto plano (para resúmenes y correos). */
export function lexicalToPlainText(jsonStr: string): string {
  if (!jsonStr) return "";
  try {
    const state = JSON.parse(jsonStr) as { root: LexNode };
    const parts: string[] = [];
    const walk = (node: LexNode) => {
      if (node.type === "text" && node.text) parts.push(node.text);
      (node.children ?? []).forEach(walk);
      if (node.type === "paragraph" || node.type === "heading") parts.push("\n");
    };
    walk(state.root);
    return parts.join("").replace(/\n{2,}/g, "\n").trim();
  } catch {
    return "";
  }
}

export function LexicalContent({ json, className }: { json: string; className?: string }) {
  if (!json) return null;

  let root: LexNode | null = null;
  try {
    root = (JSON.parse(json) as { root: LexNode }).root;
  } catch {
    return null;
  }

  return (
    <div className={className}>
      {(root.children ?? []).map((child, i) => renderBlock(child, i))}
    </div>
  );
}

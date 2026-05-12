type TextNode = { detail: 0; format: number; mode: "normal"; style: ""; text: string; type: "text"; version: 1 };
type LineBreakNode = { type: "linebreak"; version: 1 };
type ParagraphNode = { children: (TextNode | LineBreakNode)[]; direction: "ltr"; format: ""; indent: 0; type: "paragraph"; version: 1 };
type ListItemNode = { children: TextNode[]; direction: "ltr"; format: ""; indent: 0; type: "listitem"; value: number; version: 1 };
type ListNode = { children: ListItemNode[]; direction: "ltr"; format: ""; indent: 0; listType: "bullet"; start: 1; tag: "ul"; type: "list"; version: 1 };

function textNode(text: string, format = 0): TextNode {
  return { detail: 0, format, mode: "normal", style: "", text, type: "text", version: 1 };
}

export function textToLexicalJson(text: string): string {
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  const children: ParagraphNode[] = paragraphs.map((para) => {
    const lines = para.split("\n");
    const nodes: (TextNode | LineBreakNode)[] = [];
    lines.forEach((line, i) => {
      nodes.push(textNode(line));
      if (i < lines.length - 1) nodes.push({ type: "linebreak", version: 1 });
    });
    return { children: nodes, direction: "ltr", format: "", indent: 0, type: "paragraph", version: 1 };
  });

  return JSON.stringify({
    root: { children, direction: "ltr", format: "", indent: 0, type: "root", version: 1 },
  });
}

export function bulletsToLexicalJson(bullets: { text: string; bold?: boolean }[]): string {
  const items: ListItemNode[] = bullets.map((b, i) => ({
    children: [textNode(b.text, b.bold ? 1 : 0)],
    direction: "ltr",
    format: "",
    indent: 0,
    type: "listitem",
    value: i + 1,
    version: 1,
  }));

  const list: ListNode = {
    children: items,
    direction: "ltr",
    format: "",
    indent: 0,
    listType: "bullet",
    start: 1,
    tag: "ul",
    type: "list",
    version: 1,
  };

  return JSON.stringify({
    root: { children: [list], direction: "ltr", format: "", indent: 0, type: "root", version: 1 },
  });
}

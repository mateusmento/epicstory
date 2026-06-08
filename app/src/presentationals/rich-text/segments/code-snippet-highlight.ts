import { Lowlight } from "@/core/lowlight";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function hastToHtml(node: unknown): string {
  if (node == null || typeof node !== "object") return "";
  const n = node as {
    type?: string;
    value?: string;
    tagName?: string;
    children?: unknown[];
    properties?: { className?: unknown; class?: unknown };
  };

  if (n.type === "text" && typeof n.value === "string") return escapeHtml(n.value);

  if (n.type === "element") {
    const tag = n.tagName ?? "span";
    const props = n.properties as { className?: unknown; class?: unknown } | undefined;
    const rawCls = props?.className ?? props?.class;
    const cls = Array.isArray(rawCls) ? rawCls.map(String).join(" ") : rawCls != null ? String(rawCls) : "";
    const inner = Array.isArray(n.children) ? n.children.map(hastToHtml).join("") : "";
    const clsAttr = cls ? ` class="${escapeHtml(cls)}"` : "";
    return `<${tag}${clsAttr}>${inner}</${tag}>`;
  }

  if (n.type === "root" || n.type === "fragment") {
    return Array.isArray(n.children) ? n.children.map(hastToHtml).join("") : "";
  }

  if (Array.isArray(n.children)) return n.children.map(hastToHtml).join("");
  return "";
}

/** Highlight a plain snippet for insertion into `.hljs` markup (outside TipTap editors). */
export function highlightSnippetToInnerHtml(languageAttr: string | null | undefined, text: string): string {
  if (!text) return "";
  try {
    if (languageAttr?.trim()) {
      const lang = languageAttr.trim().toLowerCase();
      try {
        return hastToHtml(Lowlight.highlight(lang, text));
      } catch {
        return hastToHtml(Lowlight.highlightAuto(text));
      }
    }
    return hastToHtml(Lowlight.highlightAuto(text));
  } catch {
    return escapeHtml(text);
  }
}

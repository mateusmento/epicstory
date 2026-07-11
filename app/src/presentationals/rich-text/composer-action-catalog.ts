import type { Editor } from "@tiptap/core";

export type ComposerActionHooks = {
  onInsertImage?: () => void;
  onInsertIssue?: () => void;
};

export type ComposerCatalogAction = {
  id: string;
  label: string;
  description?: string;
  /** Slash / context insert vs selection marks. */
  group: "mark" | "structure" | "insert";
  isActive?: (editor: Editor) => boolean;
  run: (editor: Editor, hooks?: ComposerActionHooks) => void;
};

function toggleLink(editor: Editor) {
  const prev = editor.getAttributes("link").href as string | undefined;
  const url = window.prompt("Link URL", prev ?? "https://");
  if (!url) {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }
  editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
}

/** Shared rich-text actions for bubble, context menu, and slash commands. */
export const COMPOSER_CATALOG: ComposerCatalogAction[] = [
  {
    id: "bold",
    label: "Bold",
    group: "mark",
    isActive: (e) => e.isActive("bold"),
    run: (e) => e.chain().focus().toggleBold().run(),
  },
  {
    id: "italic",
    label: "Italic",
    group: "mark",
    isActive: (e) => e.isActive("italic"),
    run: (e) => e.chain().focus().toggleItalic().run(),
  },
  {
    id: "strike",
    label: "Strikethrough",
    group: "structure",
    isActive: (e) => e.isActive("strike"),
    run: (e) => e.chain().focus().toggleStrike().run(),
  },
  {
    id: "blockquote",
    label: "Blockquote",
    description: "Quote a block of text",
    group: "structure",
    isActive: (e) => e.isActive("blockquote"),
    run: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    id: "inlineCode",
    label: "Inline code",
    group: "structure",
    isActive: (e) => e.isActive("code"),
    run: (e) => e.chain().focus().toggleCode().run(),
  },
  {
    id: "heading1",
    label: "Heading 1",
    description: "Large section heading",
    group: "structure",
    isActive: (e) => e.isActive("heading", { level: 1 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: "heading2",
    label: "Heading 2",
    description: "Medium section heading",
    group: "structure",
    isActive: (e) => e.isActive("heading", { level: 2 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: "heading3",
    label: "Heading 3",
    description: "Small section heading",
    group: "structure",
    isActive: (e) => e.isActive("heading", { level: 3 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: "bulletList",
    label: "Bullet list",
    description: "Create a bullet list",
    group: "structure",
    isActive: (e) => e.isActive("bulletList"),
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    id: "orderedList",
    label: "Numbered list",
    description: "Create a numbered list",
    group: "structure",
    isActive: (e) => e.isActive("orderedList"),
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "taskList",
    label: "Task list",
    description: "Track tasks with checkboxes",
    group: "structure",
    isActive: (e) => e.isActive("taskList"),
    run: (e) => e.chain().focus().toggleTaskList().run(),
  },
  {
    id: "table",
    label: "Table",
    description: "Insert a 3×3 table",
    group: "insert",
    run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    id: "codeBlock",
    label: "Code block",
    description: "Insert a code block",
    group: "structure",
    isActive: (e) => e.isActive("codeBlock"),
    run: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: "link",
    label: "Link",
    group: "insert",
    isActive: (e) => e.isActive("link"),
    run: (e) => toggleLink(e),
  },
  {
    id: "image",
    label: "Image",
    description: "Upload an inline image",
    group: "insert",
    run: (_e, hooks) => hooks?.onInsertImage?.(),
  },
  {
    id: "mention",
    label: "Mention",
    description: "Mention a teammate",
    group: "insert",
    run: (e) => e.chain().focus().insertContent("@").run(),
  },
  {
    id: "issue",
    label: "Issue",
    description: "Insert an issue badge",
    group: "insert",
    run: (_e, hooks) => hooks?.onInsertIssue?.(),
  },
];

export function findComposerAction(id: string): ComposerCatalogAction | undefined {
  return COMPOSER_CATALOG.find((a) => a.id === id);
}

export function runComposerAction(editor: Editor, id: string, hooks?: ComposerActionHooks): boolean {
  const action = findComposerAction(id);
  if (!action) return false;
  action.run(editor, hooks);
  return true;
}

/** Slash palette items (structure + insert). */
export function slashCatalogItems(): Array<{ id: string; label: string; description?: string }> {
  return COMPOSER_CATALOG.filter((a) => a.group !== "mark").map((a) => ({
    id: a.id,
    label: a.label,
    description: a.description,
  }));
}

/** Context-menu insert items. */
export function insertCatalogItems(): ComposerCatalogAction[] {
  return COMPOSER_CATALOG.filter(
    (a) => a.group === "insert" || a.id === "taskList" || a.id === "codeBlock" || a.id === "table",
  );
}

/** Bubble formatting (marks + common structure). */
export const BUBBLE_ACTION_IDS = [
  "bold",
  "italic",
  "strike",
  "inlineCode",
  "bulletList",
  "orderedList",
  "link",
] as const;

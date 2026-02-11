export type TiptapNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, any>;
  content?: TiptapNode[];
};

export function normalizeTiptapDoc(doc: any): any {
  if (!doc || typeof doc !== 'object') return doc;
  if (doc.type !== 'doc' || !Array.isArray(doc.content)) return doc;

  function isEmptyTrailingParagraph(node: any) {
    if (!node || node.type !== 'paragraph') return false;
    if (!node.content || node.content.length === 0) return true;
    return node.content.every((c: any) => c?.type === 'hardBreak');
  }

  const next = { ...doc, content: [...doc.content] };
  while (
    next.content.length > 0 &&
    isEmptyTrailingParagraph(next.content[next.content.length - 1])
  ) {
    next.content.pop();
  }
  return next;
}

export function tiptapToPlainText(doc: TiptapNode | null | undefined): string {
  if (!doc) return '';

  function walk(node: TiptapNode, ctx?: { inListItem?: boolean }): string {
    const type = node.type ?? '';

    if (type === 'text') return node.text ?? '';
    if (type === 'hardBreak') return '\n';
    if (type === 'doc')
      return (node.content ?? []).map((c) => walk(c, ctx)).join('');

    if (type === 'mention') {
      const id = node.attrs?.id ?? node.attrs?.userId;
      if (id === undefined || id === null) return '@';
      return `@${id}`;
    }

    if (type === 'listItem') {
      const children = (node.content ?? [])
        .map((c) => walk(c, { ...ctx, inListItem: true }))
        .join('');
      return children + '\n';
    }

    const children = (node.content ?? []).map((c) => walk(c, ctx)).join('');

    // Inside list items, paragraphs/headings should not add extra newlines; listItem already handles it.
    if (
      (type === 'paragraph' || type === 'heading' || type === 'blockquote') &&
      ctx?.inListItem
    ) {
      return children;
    }

    if (type === 'paragraph' || type === 'heading' || type === 'blockquote') {
      return children + '\n';
    }

    if (type === 'bulletList' || type === 'orderedList') return children;

    return children;
  }

  return walk(normalizeTiptapDoc(doc as any))
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
}

export function extractMentionIdsFromDoc(
  doc: TiptapNode | null | undefined,
): number[] {
  if (!doc) return [];
  const ids = new Set<number>();

  function visit(node: TiptapNode) {
    if (node.type === 'mention') {
      const raw = node.attrs?.id ?? node.attrs?.userId;
      const id = Number(raw);
      if (Number.isFinite(id)) ids.add(id);
    }
    for (const child of node.content ?? []) visit(child);
  }

  visit(doc);
  return Array.from(ids);
}

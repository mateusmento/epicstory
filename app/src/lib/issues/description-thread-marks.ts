import type { DescriptionThreadMarkAttrs } from "@epicstory/tiptap/vue";
import type { Editor, Mark } from "@tiptap/core";
import type { Node as PmNode } from "@tiptap/pm/model";

export type ThreadMarkRanges = {
  baseFrom: number;
  baseTo: number;
  addedFrom: number;
  addedTo: number;
  hasAdded: boolean;
};

function isThreadMark(mark: Mark, markId?: string): boolean {
  if (mark.type.name !== "descriptionThread") return false;
  if (markId == null) return true;
  return mark.attrs.markId === markId;
}

/** Find base/added ranges for a thread markId. */
export function findDescriptionThreadRanges(ed: Editor, markId: string): ThreadMarkRanges | null {
  let baseFrom: number | null = null;
  let baseTo: number | null = null;
  let addedFrom: number | null = null;
  let addedTo: number | null = null;

  ed.state.doc.descendants((node: PmNode, pos: number) => {
    if (!node.isText) return;
    for (const mark of node.marks) {
      if (!isThreadMark(mark, markId)) continue;
      const role = (mark.attrs.role as string) ?? "anchor";
      if (role === "added") {
        if (addedFrom == null) addedFrom = pos;
        addedTo = pos + node.nodeSize;
      } else {
        // anchor | base
        if (baseFrom == null) baseFrom = pos;
        baseTo = pos + node.nodeSize;
      }
    }
  });

  if (baseFrom == null || baseTo == null) {
    if (addedFrom != null && addedTo != null) {
      return {
        baseFrom: addedFrom,
        baseTo: addedTo,
        addedFrom,
        addedTo,
        hasAdded: true,
      };
    }
    return null;
  }

  return {
    baseFrom,
    baseTo,
    addedFrom: addedFrom ?? baseFrom,
    addedTo: addedTo ?? baseTo,
    hasAdded: addedFrom != null && (addedFrom !== baseFrom || addedTo !== baseTo),
  };
}

/**
 * Remove every descriptionThread mark with this markId.
 * Does not delete text — only unwraps marks. Prefer {@link clearDescriptionThread} for suggestions.
 */
export function stripDescriptionThreadMarks(ed: Editor, markId: string): boolean {
  const markType = ed.schema.marks.descriptionThread;
  if (!markType) return false;

  const ranges: { from: number; to: number }[] = [];
  ed.state.doc.descendants((node, pos) => {
    if (!node.isText) return;
    if (node.marks.some((m) => isThreadMark(m, markId))) {
      ranges.push({ from: pos, to: pos + node.nodeSize });
    }
  });
  if (ranges.length === 0) return false;

  let tr = ed.state.tr;
  // Remove from the end so positions stay stable (though removeMark doesn't shift).
  for (const { from, to } of ranges) {
    tr = tr.removeMark(from, to, markType);
  }
  // Also strip any leftover attrs-matched marks via a full scan on the same type + markId
  tr.doc.descendants((node, pos) => {
    if (!node.isText) return;
    for (const mark of node.marks) {
      if (isThreadMark(mark, markId)) {
        tr = tr.removeMark(pos, pos + node.nodeSize, mark);
      }
    }
  });

  if (tr.doc.eq(ed.state.doc) && tr.steps.length === 0) return false;
  ed.view.dispatch(tr);
  return true;
}

/**
 * Fully clear a thread from the document:
 * - suggestions: delete the "added" span, then strip base/anchor marks
 * - comments: strip marks only
 */
export function clearDescriptionThread(ed: Editor, markId: string): boolean {
  const markType = ed.schema.marks.descriptionThread;
  if (!markType) return false;

  const ranges = findDescriptionThreadRanges(ed, markId);
  if (!ranges) {
    return stripDescriptionThreadMarks(ed, markId);
  }

  let tr = ed.state.tr;
  if (ranges.hasAdded) {
    tr = tr.delete(ranges.addedFrom, ranges.addedTo);
  }

  // After delete, map base through the transaction
  const baseFrom = tr.mapping.map(ranges.baseFrom);
  const baseTo = tr.mapping.map(ranges.baseTo);
  if (baseTo > baseFrom) {
    tr = tr.removeMark(baseFrom, baseTo, markType);
  }

  // Sweep any remaining marks with this markId
  const leftover: { from: number; to: number; mark: Mark }[] = [];
  tr.doc.descendants((node, pos) => {
    if (!node.isText) return;
    for (const mark of node.marks) {
      if (isThreadMark(mark, markId)) {
        leftover.push({ from: pos, to: pos + node.nodeSize, mark });
      }
    }
  });
  for (const { from, to, mark } of leftover) {
    tr = tr.removeMark(from, to, mark);
  }

  if (tr.steps.length === 0) return false;
  ed.view.dispatch(tr);
  return true;
}

/** Accept suggestion: replace base+added with plain proposed text (no thread marks). */
export function applyDescriptionSuggestion(ed: Editor, markId: string, proposedText: string): boolean {
  const ranges = findDescriptionThreadRanges(ed, markId);
  if (!ranges) {
    return stripDescriptionThreadMarks(ed, markId);
  }
  const from = Math.min(ranges.baseFrom, ranges.addedFrom);
  const to = Math.max(ranges.baseTo, ranges.addedTo);
  const chain = ed.chain().focus().deleteRange({ from, to });
  if (proposedText) {
    chain.insertContentAt(from, proposedText);
  }
  chain.run();
  stripDescriptionThreadMarks(ed, markId);
  return true;
}

/** Plain text of suggestion `base` marks (deleted / original). Empty for insert-only. */
export function readQuoteTextFromEditor(ed: Editor, markId: string): string {
  const ranges = findDescriptionThreadRanges(ed, markId);
  if (!ranges) return "";
  // Insert-only: finder aliases base to the added span.
  if (ranges.hasAdded && ranges.baseFrom === ranges.addedFrom && ranges.baseTo === ranges.addedTo) {
    return "";
  }
  if (!ranges.hasAdded || ranges.baseFrom !== ranges.addedFrom || ranges.baseTo !== ranges.addedTo) {
    return ed.state.doc.textBetween(ranges.baseFrom, ranges.baseTo, "");
  }
  return "";
}

export function readProposedTextFromEditor(ed: Editor, markId: string): string {
  const ranges = findDescriptionThreadRanges(ed, markId);
  if (!ranges?.hasAdded) {
    let text = "";
    ed.state.doc.descendants((node) => {
      if (!node.isText) return;
      if (node.marks.some((m) => isThreadMark(m, markId) && m.attrs.role === "added")) {
        text += node.text ?? "";
      }
    });
    return text;
  }
  return ed.state.doc.textBetween(ranges.addedFrom, ranges.addedTo, "");
}

/**
 * Add a descriptionThread mark across [from, to] without removing other marks
 * (bold, italic, link, or other thread marks when excludes allows).
 */
export function addDescriptionThreadMark(
  ed: Editor,
  from: number,
  to: number,
  attrs: DescriptionThreadMarkAttrs,
): boolean {
  const markType = ed.schema.marks.descriptionThread;
  if (!markType || from >= to) return false;
  const mark = markType.create({
    role: "anchor",
    ...attrs,
  });
  const tr = ed.state.tr.addMark(from, to, mark);
  ed.view.dispatch(tr);
  return true;
}

/**
 * Notion-style suggest start: mark the original selection as base only.
 * Proposed text is inserted later as the user types (see {@link attachSuggestionDraftTyping}).
 */
export function markSuggestionBase(ed: Editor, from: number, to: number, markId: string): boolean {
  const markType = ed.schema.marks.descriptionThread;
  if (!markType || from >= to) return false;
  const baseMark = markType.create({ markId, kind: "suggestion", role: "base" });
  ed.view.dispatch(ed.state.tr.addMark(from, to, baseMark));
  return true;
}

/**
 * Notion-style suggest (legacy): mark original as base and immediately insert a copy as added.
 * Prefer {@link markSuggestionBase} + {@link attachSuggestionDraftTyping} for type-to-add UX.
 */
export function beginInlineSuggestion(ed: Editor, from: number, to: number, markId: string): number {
  const markType = ed.schema.marks.descriptionThread;
  if (!markType || from >= to) return to;

  const baseMark = markType.create({ markId, kind: "suggestion", role: "base" });
  const addedMark = markType.create({ markId, kind: "suggestion", role: "added" });

  let tr = ed.state.tr.addMark(from, to, baseMark);

  // Build a copy of the selected inline content, preserving existing marks + added.
  const nodes: PmNode[] = [];
  ed.state.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isText) return;
    const start = Math.max(pos, from);
    const end = Math.min(pos + node.nodeSize, to);
    if (start >= end) return;
    const sliced = node.cut(start - pos, end - pos);
    // Keep non-thread marks; attach suggestion "added" mark.
    const kept = sliced.marks.filter((m) => m.type !== markType);
    nodes.push(sliced.mark(kept.concat(addedMark)));
  });

  if (nodes.length === 0) {
    const text = ed.state.doc.textBetween(from, to, "\n");
    nodes.push(ed.schema.text(text, [addedMark]));
  }

  let insertPos = to;
  for (const node of nodes) {
    tr = tr.insert(insertPos, node);
    insertPos += node.nodeSize;
  }

  ed.view.dispatch(tr);
  return insertPos;
}

import {
  findDescriptionThreadRanges,
  readProposedTextFromEditor,
  readQuoteTextFromEditor,
} from "@/lib/issues/description-thread-marks";
import { normalizeTiptapDoc } from "@epicstory/tiptap";
import type { Editor, JSONContent } from "@tiptap/core";
import type { Mark, MarkType } from "@tiptap/pm/model";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

const suggestModePluginKey = new PluginKey("epicstorySuggestMode");

export type SuggestRecordingCommit = {
  markId: string;
  quoteText: string;
  proposedText: string;
  description: JSONContent;
};

export type SuggestModeHandle = {
  /** Enter suggest mode; collapses the current selection. */
  start: () => void;
  /** Leave suggest mode; commits the open recording when it has edits. */
  stop: () => void;
  /** Commit the open recording without leaving suggest mode. */
  commitOpen: () => void;
  isActive: () => boolean;
  destroy: () => void;
};

function threadMarkType(view: EditorView): MarkType | null {
  return view.state.schema.marks.descriptionThread ?? null;
}

function recordingBounds(ed: Editor, markId: string): { from: number; to: number } | null {
  const ranges = findDescriptionThreadRanges(ed, markId);
  if (!ranges) return null;
  return {
    from: Math.min(ranges.baseFrom, ranges.addedFrom),
    to: Math.max(ranges.baseTo, ranges.addedTo),
  };
}

function recordingHasEdits(ed: Editor, markId: string): boolean {
  return readQuoteTextFromEditor(ed, markId).length > 0 || readProposedTextFromEditor(ed, markId).length > 0;
}

/** Marks on the text character that starts at `pos`. */
function marksAtChar(view: EditorView, pos: number): readonly Mark[] {
  try {
    const $pos = view.state.doc.resolve(pos);
    if ($pos.nodeAfter?.isText) return $pos.nodeAfter.marks;
    const before = view.state.doc.resolve(pos + 1).nodeBefore;
    if (before?.isText) return before.marks;
    return $pos.marks();
  } catch {
    return [];
  }
}

function markIsRole(view: EditorView, pos: number, markId: string, role: "base" | "added"): boolean {
  const markType = threadMarkType(view);
  if (!markType) return false;
  return marksAtChar(view, pos).some(
    (m) => m.type === markType && m.attrs.markId === markId && m.attrs.role === role,
  );
}

/**
 * Notion-style suggest mode: after Suggest is clicked, subsequent inserts/deletes/replaces
 * are recorded as suggestion marks. Moving the caret away commits the current recording
 * and the next edit starts a new one.
 */
export function createSuggestMode(
  ed: Editor,
  onCommit: (payload: SuggestRecordingCommit) => void | Promise<void>,
): SuggestModeHandle {
  let active = false;
  let currentMarkId: string | null = null;
  let committing = false;

  function ensureMarkId(): string {
    if (!currentMarkId) currentMarkId = crypto.randomUUID();
    return currentMarkId;
  }

  async function commitCurrent() {
    const markId = currentMarkId;
    if (!markId || committing || !active) return;
    if (!recordingHasEdits(ed, markId)) {
      currentMarkId = null;
      return;
    }
    committing = true;
    currentMarkId = null;
    try {
      await onCommit({
        markId,
        quoteText: readQuoteTextFromEditor(ed, markId),
        proposedText: readProposedTextFromEditor(ed, markId),
        description: normalizeTiptapDoc(ed.getJSON()),
      });
    } finally {
      committing = false;
    }
  }

  function insertAdded(view: EditorView, from: number, to: number, text: string): boolean {
    if (!text) return false;
    const markType = threadMarkType(view);
    if (!markType) return false;
    const markId = ensureMarkId();
    const baseMark = markType.create({ markId, kind: "suggestion", role: "base" });
    const addedMark = markType.create({ markId, kind: "suggestion", role: "added" });

    let tr = view.state.tr;
    if (from !== to) {
      tr = tr.addMark(from, to, baseMark);
      tr = tr.insertText(text, to);
      tr = tr.addMark(to, to + text.length, addedMark);
      tr = tr.setSelection(TextSelection.create(tr.doc, to + text.length));
    } else {
      tr = tr.insertText(text, from);
      tr = tr.addMark(from, from + text.length, addedMark);
      tr = tr.setSelection(TextSelection.create(tr.doc, from + text.length));
    }
    view.dispatch(tr.scrollIntoView());
    return true;
  }

  function markRangeAsBase(view: EditorView, from: number, to: number): boolean {
    if (from >= to) return false;
    const markType = threadMarkType(view);
    if (!markType) return false;
    const markId = ensureMarkId();
    const baseMark = markType.create({ markId, kind: "suggestion", role: "base" });
    let tr = view.state.tr.addMark(from, to, baseMark);
    tr = tr.setSelection(TextSelection.create(tr.doc, from));
    view.dispatch(tr.scrollIntoView());
    return true;
  }

  function handleBackspace(view: EditorView): boolean {
    const { from, to, empty } = view.state.selection;
    if (!empty) return markRangeAsBase(view, from, to);

    if (from <= 1) return false;
    const delFrom = from - 1;
    const delTo = from;
    const markId = currentMarkId;

    if (markId && markIsRole(view, delFrom, markId, "added")) {
      view.dispatch(view.state.tr.delete(delFrom, delTo).scrollIntoView());
      return true;
    }
    if (markId && markIsRole(view, delFrom, markId, "base")) {
      view.dispatch(
        view.state.tr.setSelection(TextSelection.create(view.state.doc, delFrom)).scrollIntoView(),
      );
      return true;
    }

    return markRangeAsBase(view, delFrom, delTo);
  }

  function handleDeleteKey(view: EditorView): boolean {
    const { from, to, empty } = view.state.selection;
    if (!empty) return markRangeAsBase(view, from, to);

    if (from >= view.state.doc.content.size) return false;
    const delFrom = from;
    const delTo = from + 1;
    const markId = currentMarkId;

    if (markId && markIsRole(view, delFrom, markId, "added")) {
      view.dispatch(view.state.tr.delete(delFrom, delTo).scrollIntoView());
      return true;
    }
    if (markId && markIsRole(view, delFrom, markId, "base")) {
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, delTo)).scrollIntoView());
      return true;
    }
    return markRangeAsBase(view, delFrom, delTo);
  }

  function onSelectionChange() {
    if (!active || !currentMarkId || committing) return;
    const bounds = recordingBounds(ed, currentMarkId);
    if (!bounds) return;
    const head = ed.state.selection.head;
    if (head < bounds.from || head > bounds.to) {
      void commitCurrent();
    }
  }

  const plugin = new Plugin({
    key: suggestModePluginKey,
    props: {
      handleTextInput(view, from, to, text) {
        if (!active) return false;
        return insertAdded(view, from, to, text);
      },
      handlePaste(view, event) {
        if (!active) return false;
        const text = event.clipboardData?.getData("text/plain");
        if (!text) return false;
        const { from, to } = view.state.selection;
        if (!insertAdded(view, from, to, text)) return false;
        event.preventDefault();
        return true;
      },
      handleKeyDown(view, event) {
        if (!active) return false;
        if (event.key === "Backspace") {
          event.preventDefault();
          return handleBackspace(view);
        }
        if (event.key === "Delete") {
          event.preventDefault();
          return handleDeleteKey(view);
        }
        return false;
      },
    },
  });

  try {
    ed.unregisterPlugin(suggestModePluginKey);
  } catch {
    /* not registered */
  }
  ed.registerPlugin(plugin);

  const onSel = () => onSelectionChange();
  const onBlur = () => {
    if (active) void commitCurrent();
  };
  ed.on("selectionUpdate", onSel);
  ed.on("blur", onBlur);

  return {
    start() {
      active = true;
      currentMarkId = null;
      const { to } = ed.state.selection;
      ed.chain().focus().setTextSelection(to).run();
    },
    stop() {
      if (!active) return;
      void commitCurrent().finally(() => {
        active = false;
        currentMarkId = null;
      });
    },
    commitOpen() {
      void commitCurrent();
    },
    isActive: () => active,
    destroy() {
      ed.off("selectionUpdate", onSel);
      ed.off("blur", onBlur);
      active = false;
      currentMarkId = null;
      try {
        ed.unregisterPlugin(suggestModePluginKey);
      } catch {
        /* already gone */
      }
    },
  };
}

import { normalizeTiptapDoc, tiptapToPlainText } from "@epicstory/tiptap";
import type { Editor, JSONContent } from "@tiptap/core";
import { debounce } from "lodash";
import { toValue, type ReadonlyRefOrGetter } from "@/utils";
import { nextTick, onScopeDispose, watch } from "vue";

type EditingMessage = { id: number; content: JSONContent } | null;

export function channelComposerDraftKey(channelId: number) {
  return `channelComposerDraft:${channelId}`;
}

export type ChannelComposerDraft = {
  content: JSONContent;
};

export function loadChannelDraft(channelId: number): ChannelComposerDraft | null {
  try {
    const raw = localStorage.getItem(channelComposerDraftKey(channelId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChannelComposerDraft;
    if (parsed?.content && typeof parsed.content === "object") return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export function saveChannelDraft(channelId: number, content: JSONContent) {
  try {
    const payload: ChannelComposerDraft = { content };
    localStorage.setItem(channelComposerDraftKey(channelId), JSON.stringify(payload));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearChannelDraft(channelId: number) {
  try {
    localStorage.removeItem(channelComposerDraftKey(channelId));
  } catch {
    /* ignore */
  }
}

/**
 * Debounced localStorage draft persistence for the channel message composer.
 * Separate from typing / websocket signals — call `scheduleDraftSave` from editor `update` only.
 */
export function useChannelMessageDraft(options: {
  channelId: ReadonlyRefOrGetter<number | undefined>;
  editingMessage: ReadonlyRefOrGetter<EditingMessage>;
  editor: ReadonlyRefOrGetter<Editor | null | undefined>;
  runWithEditorMutationSuppressed?: (fn: () => Promise<void>) => Promise<void>;
  /** When the channel changes before an editor instance exists, run this so typing suppression does not stay stuck (e.g. clear `suppressTypingSignals`). */
  whenEditorMissingAfterChannelChange?: () => void;
}) {
  function saveDraft(doc: JSONContent | null | undefined) {
    if (!doc) return;

    /* If we're editing a message, don't save the draft */
    if (toValue(options.editingMessage)) return;

    const channelId = toValue(options.channelId);
    if (channelId == null) return;

    const normalizedDoc = normalizeTiptapDoc(doc);
    const plain = tiptapToPlainText(normalizedDoc, { stripFormatting: true }).trim();
    if (!plain) clearChannelDraft(channelId);
    else saveChannelDraft(channelId, normalizedDoc);
  }

  const scheduleDraftSave = debounce((doc: JSONContent | null | undefined) => {
    saveDraft(doc);
  }, 400);

  function flushDraftSync(doc: JSONContent | null | undefined) {
    scheduleDraftSave.cancel();
    saveDraft(doc);
  }

  function cancelPendingDraftSave() {
    scheduleDraftSave.cancel();
  }

  async function loadDraftToEditor(editor: Editor | null | undefined) {
    const channelId = toValue(options.channelId);
    if (!editor || channelId == null) return;

    const draft = loadChannelDraft(channelId);
    if (draft?.content) {
      editor.commands.setContent(normalizeTiptapDoc(draft.content));
    } else {
      editor.commands.clearContent();
    }
    await nextTick();
  }

  watch(
    () => toValue(options.channelId),
    async () => {
      cancelPendingDraftSave();
      const editor = toValue(options.editor);
      if (!editor) {
        options.whenEditorMissingAfterChannelChange?.();
        return;
      }
      if (options.runWithEditorMutationSuppressed) {
        await options.runWithEditorMutationSuppressed(() => loadDraftToEditor(editor));
      } else {
        await loadDraftToEditor(editor);
      }
    },
    { flush: "post" },
  );

  onScopeDispose(() => {
    flushDraftSync(toValue(options.editor)?.getJSON());
  });

  return {
    loadDraftToEditor,
    scheduleDraftSave,
    flushDraftSync,
    cancelPendingDraftSave,
  };
}

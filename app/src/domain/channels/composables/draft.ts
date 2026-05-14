import { toValue, type ReadonlyRefOrGetter } from "@/utils";
import type { MessagePollBody, MessagePollOptionBody } from "@epicstory/contracts";
import { docContainsImageNodes, normalizeTiptapDoc, tiptapToPlainText } from "@epicstory/tiptap";
import type { Editor, JSONContent } from "@tiptap/core";
import { debounce } from "lodash";
import { nextTick, onScopeDispose, watch } from "vue";

type EditingMessage = { id: number; content: JSONContent } | null;

export function channelComposerDraftKey(channelId: number) {
  return `channelComposerDraft:${channelId}`;
}

export type ChannelComposerDraft = {
  content: JSONContent;
  poll?: MessagePollBody | null;
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

export function saveChannelDraft(channelId: number, draft: ChannelComposerDraft) {
  try {
    localStorage.setItem(channelComposerDraftKey(channelId), JSON.stringify(draft));
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

function draftHasMeaningfulPoll(poll: MessagePollBody | null | undefined): boolean {
  if (!poll) return false;
  const q = poll.question.trim();
  const nonempty = poll.options.filter((o: MessagePollOptionBody) => o.label.trim().length > 0);
  return q.length > 0 && nonempty.length >= 2;
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
  /** When set, poll JSON is saved/restored with `content` for this channel draft. */
  getPollDraft?: ReadonlyRefOrGetter<MessagePollBody | null | undefined>;
  /** After switching channels / hydrating localStorage — parent can sync inline poll UI. */
  onDraftRestored?: (draft: ChannelComposerDraft | null) => void;
}) {
  function saveDraft(doc: JSONContent | null | undefined) {
    if (!doc) return;

    /* If we're editing a message, don't save the draft */
    if (toValue(options.editingMessage)) return;

    const channelId = toValue(options.channelId);
    if (channelId == null) return;

    const normalizedDoc = normalizeTiptapDoc(doc);
    const plain = tiptapToPlainText(normalizedDoc, { stripFormatting: true }).trim();
    const poll = options.getPollDraft !== undefined ? (toValue(options.getPollDraft) ?? null) : undefined;

    const hasPollMeaningful =
      options.getPollDraft !== undefined ? draftHasMeaningfulPoll(poll ?? null) : false;

    if (!plain && !docContainsImageNodes(normalizedDoc) && !hasPollMeaningful) {
      clearChannelDraft(channelId);
      return;
    }

    const payload: ChannelComposerDraft = { content: normalizedDoc };
    if (options.getPollDraft !== undefined) {
      payload.poll = poll ?? null;
    }
    saveChannelDraft(channelId, payload);
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
    options.onDraftRestored?.(draft ?? null);
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

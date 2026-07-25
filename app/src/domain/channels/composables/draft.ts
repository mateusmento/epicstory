import { toValue, type ReadonlyRefOrGetter } from "@/utils";
import type { ChannelApi } from "@epicstory/api-client";
import type {
  IMessageDraft,
  MessagePollBody,
  MessagePollOptionBody,
  UploadedAttachment,
} from "@epicstory/contracts";
import {
  collectImageAttachmentIdsFromDoc,
  docContainsImageNodes,
  normalizeTiptapDoc,
  tiptapToPlainText,
} from "@epicstory/tiptap";
import type { Editor, JSONContent } from "@tiptap/core";
import { debounce } from "lodash";
import { nextTick, onScopeDispose, ref, watch } from "vue";

type EditingMessage = { id: number; content: JSONContent } | null;

export function channelComposerDraftKey(channelId: number, threadMessageId?: number | null) {
  return threadMessageId != null
    ? `channelComposerDraft:${channelId}:thread:${threadMessageId}`
    : `channelComposerDraft:${channelId}`;
}

export type ChannelComposerDraft = {
  content: JSONContent;
  poll?: MessagePollBody | null;
};

export function loadChannelDraft(
  channelId: number,
  threadMessageId?: number | null,
): ChannelComposerDraft | null {
  try {
    const raw = localStorage.getItem(channelComposerDraftKey(channelId, threadMessageId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChannelComposerDraft;
    if (parsed?.content && typeof parsed.content === "object") return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export function saveChannelDraft(
  channelId: number,
  draft: ChannelComposerDraft,
  threadMessageId?: number | null,
) {
  try {
    localStorage.setItem(channelComposerDraftKey(channelId, threadMessageId), JSON.stringify(draft));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearChannelDraft(channelId: number, threadMessageId?: number | null) {
  try {
    localStorage.removeItem(channelComposerDraftKey(channelId, threadMessageId));
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

function isMeaningfulDraft(
  doc: JSONContent,
  poll: MessagePollBody | null | undefined,
  hasPollField: boolean,
): boolean {
  const plain = tiptapToPlainText(doc, { stripFormatting: true }).trim();
  const hasPollMeaningful = hasPollField ? draftHasMeaningfulPoll(poll ?? null) : false;
  return !!plain || docContainsImageNodes(doc) || hasPollMeaningful;
}

/**
 * Dual-write channel drafts: localStorage mirror + optional server PUT (versioned).
 * Server is source of truth when online; local mirror keeps typing offline.
 */
export function useChannelMessageDraft(options: {
  channelId: ReadonlyRefOrGetter<number | undefined>;
  editingMessage: ReadonlyRefOrGetter<EditingMessage>;
  editor: ReadonlyRefOrGetter<Editor | null | undefined>;
  seedContent?: ReadonlyRefOrGetter<JSONContent | null | undefined>;
  runWithEditorMutationSuppressed?: (fn: () => Promise<void>) => Promise<void>;
  whenEditorMissingAfterChannelChange?: () => void;
  getPollDraft?: ReadonlyRefOrGetter<MessagePollBody | null | undefined>;
  onDraftRestored?: (draft: ChannelComposerDraft | null) => void;
  /** When set, drafts sync to the server (dual-write). */
  channelApi?: ChannelApi;
  threadMessageId?: ReadonlyRefOrGetter<number | null | undefined>;
  /** Extra attachment ids to keep as tiles (not only TipTap inline ids). */
  getTileAttachmentIds?: ReadonlyRefOrGetter<number[]>;
  onServerDraftLoaded?: (draft: IMessageDraft | null) => void;
}) {
  const serverVersion = ref(0);
  const serverAttachments = ref<UploadedAttachment[]>([]);

  function resetServerDraftState() {
    serverVersion.value = 0;
    serverAttachments.value = [];
  }

  function threadId() {
    return options.threadMessageId != null ? (toValue(options.threadMessageId) ?? null) : null;
  }

  function desiredAttachmentIds(doc: JSONContent): number[] {
    const inline = collectImageAttachmentIdsFromDoc(doc);
    const tiles = options.getTileAttachmentIds != null ? toValue(options.getTileAttachmentIds) : [];
    return [...new Set([...inline, ...tiles])];
  }

  function saveLocal(doc: JSONContent, poll: MessagePollBody | null | undefined) {
    const channelId = toValue(options.channelId);
    if (channelId == null) return;
    const payload: ChannelComposerDraft = { content: doc };
    if (options.getPollDraft !== undefined) {
      payload.poll = poll ?? null;
    }
    saveChannelDraft(channelId, payload, threadId());
  }

  async function saveServer(doc: JSONContent, poll: MessagePollBody | null | undefined, clear: boolean) {
    const api = options.channelApi;
    const channelId = toValue(options.channelId);
    if (!api || channelId == null) return;

    const opts = { threadMessageId: threadId() };
    try {
      if (clear) {
        if (serverVersion.value > 0) {
          await api.deleteMessageDraft(channelId, {
            ...opts,
            version: serverVersion.value,
          });
        }
        resetServerDraftState();
        return;
      }

      const draft = await api.putMessageDraft(
        channelId,
        {
          content: doc,
          ...(options.getPollDraft !== undefined ? { poll: poll ?? null } : {}),
          attachmentIds: desiredAttachmentIds(doc),
          version: serverVersion.value,
        },
        opts,
      );
      serverVersion.value = draft.version;
      serverAttachments.value = draft.attachments ?? [];
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { draft?: IMessageDraft } } })?.response
        ?.status;
      if (status === 409) {
        const conflict = (err as { response?: { data?: { draft?: IMessageDraft } } })?.response?.data?.draft;
        if (conflict) {
          serverVersion.value = conflict.version;
          serverAttachments.value = conflict.attachments ?? [];
          options.onServerDraftLoaded?.(conflict);
        } else {
          // Draft gone (e.g. consumed by send) — reset so the next PUT can create.
          resetServerDraftState();
          options.onServerDraftLoaded?.(null);
        }
      }
      /* Offline / transient: local mirror still holds content. */
    }
  }

  function saveDraft(doc: JSONContent | null | undefined) {
    if (!doc) return;
    if (toValue(options.editingMessage)) return;

    const channelId = toValue(options.channelId);
    if (channelId == null) return;

    const normalizedDoc = normalizeTiptapDoc(doc);
    const poll = options.getPollDraft !== undefined ? (toValue(options.getPollDraft) ?? null) : undefined;
    const hasPollField = options.getPollDraft !== undefined;
    const meaningful = isMeaningfulDraft(normalizedDoc, poll, hasPollField);

    if (!meaningful) {
      clearChannelDraft(channelId, threadId());
      saveServer(normalizedDoc, poll, true).catch(() => {});
      return;
    }

    saveLocal(normalizedDoc, poll);
    saveServer(normalizedDoc, poll, false).catch(() => {});
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

  async function hydrateFromServer(channelId: number): Promise<IMessageDraft | null> {
    if (!options.channelApi) return null;
    try {
      const draft = await options.channelApi.getMessageDraft(channelId, {
        threadMessageId: threadId(),
      });
      if (draft) {
        serverVersion.value = draft.version;
        serverAttachments.value = draft.attachments ?? [];
        options.onServerDraftLoaded?.(draft);
        return draft;
      }
      serverVersion.value = 0;
      serverAttachments.value = [];
      options.onServerDraftLoaded?.(null);
    } catch {
      /* offline — fall back to local */
    }
    return null;
  }

  async function migrateLocalToServer(channelId: number, local: ChannelComposerDraft) {
    if (!options.channelApi) return;
    const poll = local.poll ?? null;
    if (!isMeaningfulDraft(local.content, poll, options.getPollDraft !== undefined)) {
      return;
    }
    try {
      const draft = await options.channelApi.putMessageDraft(
        channelId,
        {
          content: normalizeTiptapDoc(local.content),
          ...(options.getPollDraft !== undefined ? { poll } : {}),
          attachmentIds: desiredAttachmentIds(local.content),
          // Prefer hydrated version when a draft already exists (e.g. from upload ensureDraft).
          version: serverVersion.value,
        },
        { threadMessageId: threadId() },
      );
      serverVersion.value = draft.version;
      serverAttachments.value = draft.attachments ?? [];
      options.onServerDraftLoaded?.(draft);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { draft?: IMessageDraft } } })?.response
        ?.status;
      if (status === 409) {
        const conflict = (err as { response?: { data?: { draft?: IMessageDraft } } })?.response?.data?.draft;
        if (conflict) {
          serverVersion.value = conflict.version;
          serverAttachments.value = conflict.attachments ?? [];
          options.onServerDraftLoaded?.(conflict);
        } else {
          resetServerDraftState();
        }
      }
      /* keep local on other errors */
    }
  }

  async function loadDraftToEditor(editor: Editor | null | undefined) {
    const channelId = toValue(options.channelId);
    if (!editor || channelId == null) return;

    const seed = options.seedContent ? toValue(options.seedContent) : null;
    if (seed) {
      const normalized = normalizeTiptapDoc(seed);
      editor.commands.setContent(normalized);
      saveChannelDraft(channelId, { content: normalized }, threadId());
      options.onDraftRestored?.({ content: normalized });
      await nextTick();
      return;
    }

    const server = await hydrateFromServer(channelId);
    const local = loadChannelDraft(channelId, threadId());

    if (server) {
      const content = normalizeTiptapDoc(server.content);
      editor.commands.setContent(content);
      saveChannelDraft(channelId, { content, poll: server.poll }, threadId());
      options.onDraftRestored?.({ content, poll: server.poll });
    } else if (local?.content) {
      editor.commands.setContent(normalizeTiptapDoc(local.content));
      options.onDraftRestored?.(local);
      await migrateLocalToServer(channelId, local);
    } else {
      editor.commands.clearContent();
      options.onDraftRestored?.(null);
    }
    await nextTick();
  }

  watch(
    () =>
      [
        toValue(options.channelId),
        toValue(options.editor),
        toValue(options.editingMessage)?.id ?? null,
        options.seedContent ? toValue(options.seedContent) : null,
        options.threadMessageId != null ? (toValue(options.threadMessageId) ?? null) : null,
      ] as const,
    async ([channelId, editor]) => {
      cancelPendingDraftSave();
      if (channelId == null) return;
      if (!editor) {
        options.whenEditorMissingAfterChannelChange?.();
        return;
      }
      if (toValue(options.editingMessage)) return;
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
    resetServerDraftState,
    serverVersion,
    serverAttachments,
  };
}

import type { ReadonlyRefOrGetter } from "@/utils";
import type { IMessage } from "@epicstory/contracts";
import { computed, ref, toValue, watch } from "vue";

export function useChatboxComposerSession(options: {
  messageIds: ReadonlyRefOrGetter<Set<number>>;
  channelId?: ReadonlyRefOrGetter<number | undefined>;
  externalQuotedMessage?: ReadonlyRefOrGetter<IMessage | null | undefined>;
}) {
  const quotedMessage = ref<IMessage | null>(null);
  const editingMessage = ref<IMessage | null>(null);
  const quoteIsExternal = ref(false);

  watch(
    () => toValue(options.messageIds),
    (ids) => {
      const q = quotedMessage.value;
      if (!q || quoteIsExternal.value) return;
      const channelId = options.channelId ? toValue(options.channelId) : undefined;
      if (channelId != null && q.channelId !== channelId) return;
      if (!ids.has(q.id)) {
        quotedMessage.value = null;
      }
    },
  );

  function onQuote(message: IMessage | undefined, opts?: { external?: boolean }) {
    if (!message || "messageId" in message) return;
    quotedMessage.value = message;
    quoteIsExternal.value = opts?.external === true;
    editingMessage.value = null;
  }

  function onStartEdit(message: IMessage | undefined) {
    if (!message || "messageId" in message) return;
    editingMessage.value = message;
    quotedMessage.value = null;
    quoteIsExternal.value = false;
  }

  function onCancelEdit() {
    editingMessage.value = null;
  }

  function onClearQuote() {
    quotedMessage.value = null;
    quoteIsExternal.value = false;
  }

  function clearSession() {
    quotedMessage.value = null;
    editingMessage.value = null;
    quoteIsExternal.value = false;
  }

  return {
    quotedMessage,
    editingMessage,
    quoteIsExternal,
    onQuote,
    onStartEdit,
    onCancelEdit,
    onClearQuote,
    clearSession,
  };
}

export function chatTimelineMessageIds(
  timeline: ReadonlyRefOrGetter<Array<{ kind: string; group?: { messages: { id: number }[] } }>>,
) {
  return computed(() => {
    const items = toValue(timeline);
    return new Set(
      items.flatMap((item) =>
        item.kind === "messages" ? (item.group?.messages.map((m) => m.id) ?? []) : [],
      ),
    );
  });
}

import type { ReadonlyRefOrGetter } from "@/utils";
import type { IMessage } from "@epicstory/contracts";
import { computed, ref, toValue, watch } from "vue";

export function useChatboxComposerSession(options: { messageIds: ReadonlyRefOrGetter<Set<number>> }) {
  const quotedMessage = ref<IMessage | null>(null);
  const editingMessage = ref<IMessage | null>(null);

  watch(
    () => toValue(options.messageIds),
    (ids) => {
      const q = quotedMessage.value;
      if (!q) return;
      if (!ids.has(q.id)) {
        quotedMessage.value = null;
      }
    },
  );

  function onQuote(message: IMessage | undefined) {
    if (!message || "messageId" in message) return;
    quotedMessage.value = message;
    editingMessage.value = null;
  }

  function onStartEdit(message: IMessage | undefined) {
    if (!message || "messageId" in message) return;
    editingMessage.value = message;
    quotedMessage.value = null;
  }

  function onCancelEdit() {
    editingMessage.value = null;
  }

  function onClearQuote() {
    quotedMessage.value = null;
  }

  function clearSession() {
    quotedMessage.value = null;
    editingMessage.value = null;
  }

  return {
    quotedMessage,
    editingMessage,
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

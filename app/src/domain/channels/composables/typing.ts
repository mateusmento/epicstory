import { useWebSockets } from "@/core/websockets";
import { toReadonlyRef, type ReadonlyRefOrGetter } from "@/utils";
import { tiptapToPlainText } from "@epicstory/tiptap";
import type { Editor, JSONContent } from "@tiptap/core";
import { onScopeDispose, ref, watch } from "vue";

/** Receiver: drop typing user if no pulse within this window */
export const CHANNEL_TYPING_TTL_MS = 5500;

/** How often we prune stale typing users */
export const CHANNEL_TYPING_PRUNE_INTERVAL_MS = 500;

/** Sender: emit channel-typing-pulse at this interval while composing */
export const CHANNEL_TYPING_PULSE_MS = 2500;

export function pruneStaleTyping(activity: Map<number, number>, now = Date.now()) {
  for (const [userId, at] of activity) {
    if (now - at > CHANNEL_TYPING_TTL_MS) activity.delete(userId);
  }
}

export function useChannelTypingPulse(options: {
  channelId: ReadonlyRefOrGetter<number | undefined>;
  editor: ReadonlyRefOrGetter<Editor | null | undefined>;
}) {
  const channelId = toReadonlyRef(options.channelId);
  const editor = toReadonlyRef(options.editor);

  const { websocket } = useWebSockets();

  const suppressTypingSignals = ref(true);
  const isEmittingTyping = ref(false);
  const pulseTimer = ref<ReturnType<typeof setInterval> | null>(null);

  function clearTypingPulse() {
    if (pulseTimer.value) {
      clearInterval(pulseTimer.value);
      pulseTimer.value = null;
    }
  }

  function emitTypingPulse() {
    if (channelId.value == null) return;
    websocket?.emit("channel-typing-pulse", { channelId: channelId.value });
  }

  function emitTypingStop() {
    if (channelId.value == null) return;
    emitTypingStopForChannel(channelId.value);
    isEmittingTyping.value = false;
    clearTypingPulse();
  }

  function emitTypingStopForChannel(channelId: number) {
    websocket?.emit("channel-typing-stop", { channelId });
  }

  function isDocEmpty(doc: JSONContent) {
    return !tiptapToPlainText(doc, { stripFormatting: true }).trim();
  }

  function stopPulsingOnEmptyOrBlur(ed: Editor) {
    if (!isDocEmpty(ed.getJSON()) || !ed.isFocused) {
      clearTypingPulse();
      emitTypingStop();
    }
  }

  function maybeStartTypingPulse(ed: Editor) {
    if (suppressTypingSignals.value) return;
    if (channelId.value == null) return;

    stopPulsingOnEmptyOrBlur(ed);

    if (!isEmittingTyping.value) {
      isEmittingTyping.value = true;
      emitTypingPulse();
      clearTypingPulse();

      pulseTimer.value = setInterval(() => {
        if (!editor.value) return;
        stopPulsingOnEmptyOrBlur(editor.value);
        emitTypingPulse();
      }, CHANNEL_TYPING_PULSE_MS);
    }
  }

  async function runWithTypingSuppressedDuringEditorMutation(fn: () => Promise<void>): Promise<void> {
    suppressTypingSignals.value = true;
    try {
      await fn();
    } finally {
      suppressTypingSignals.value = false;
    }
  }

  watch(
    () => channelId.value,
    (_id, prevId) => {
      isEmittingTyping.value = false;
      if (prevId != null) {
        emitTypingStopForChannel(prevId);
      }
      clearTypingPulse();
    },
    { flush: "post" },
  );

  onScopeDispose(() => {
    emitTypingStop();
  });

  return {
    suppressTypingSignals,
    isEmittingTyping,
    clearTypingPulse,
    emitTypingPulse,
    emitTypingStop,
    emitTypingStopForChannel,
    maybeStartTypingPulse,
    runWithTypingSuppressedDuringEditorMutation,
  };
}

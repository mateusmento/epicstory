import type { Editor } from "@tiptap/core";
import { computed, nextTick, ref, watch } from "vue";
import type { ReadonlyRefOrGetter } from "@/utils";
import { toValue } from "@/utils";
import { formatScheduleSummary, type ResolvedSchedule } from "../schedule-builders";

type EditingMessageLike = { id: number } | null | undefined;

export function useMessageComposerSchedule(options: {
  channelId: ReadonlyRefOrGetter<number>;
  getEditor: () => Editor | null;
  editingMessage: ReadonlyRefOrGetter<EditingMessageLike>;
}) {
  const customScheduleOpen = ref(false);
  const activeSchedule = ref<ResolvedSchedule | null>(null);

  const scheduleSummary = computed(() =>
    activeSchedule.value ? formatScheduleSummary(activeSchedule.value) : "",
  );

  function onCustomScheduleConfirm(s: ResolvedSchedule) {
    activeSchedule.value = s;
    customScheduleOpen.value = false;
  }

  function clearActiveSchedule() {
    activeSchedule.value = null;
  }

  function focusComposerEnd() {
    const ed = options.getEditor();
    if (ed) ed.chain().focus("end").run();
  }

  watch(customScheduleOpen, (open) => {
    if (open) return;
    nextTick().then(() => {
      focusComposerEnd();
    });
  });

  watch(
    () => toValue(options.channelId),
    () => {
      activeSchedule.value = null;
    },
    { flush: "post" },
  );

  watch(
    () => toValue(options.editingMessage),
    (msg) => {
      if (msg) {
        activeSchedule.value = null;
      }
    },
  );

  return {
    customScheduleOpen,
    activeSchedule,
    scheduleSummary,
    onCustomScheduleConfirm,
    clearActiveSchedule,
  };
}

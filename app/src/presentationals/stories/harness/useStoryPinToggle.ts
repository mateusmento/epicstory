import type { MeetingGridLayoutView } from "@/lib/meetings";
import { ref, type Ref } from "vue";

export function useStoryPinToggle(layout: Ref<MeetingGridLayoutView>) {
  const pinnedId = ref<string | null>(layout.value.pinnedId);

  function togglePin(participantId: string) {
    pinnedId.value = pinnedId.value === participantId ? null : participantId;
    layout.value = { ...layout.value, pinnedId: pinnedId.value };
  }

  return { pinnedId, togglePin };
}

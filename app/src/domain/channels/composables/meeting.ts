import { defineStore, storeToRefs } from "pinia";
import { ref } from "vue";
import type { IMeeting } from "../types";

const useMeetingStore = defineStore("meeting", () => {
  const ongoingMeeting = ref<IMeeting | null>();
  return { ongoingMeeting };
});

export function useMeeting() {
  const store = useMeetingStore();

  return {
    ...storeToRefs(store),
  };
}

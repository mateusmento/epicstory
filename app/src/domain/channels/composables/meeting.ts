import { defineStore, storeToRefs } from "pinia";
import { ref } from "vue";
import type { IMeeting } from "../types";

const useMeetingStore = defineStore("meeting", () => {
  const meeting = ref<IMeeting | null>();
  return { meeting };
});

export function useMeeting() {
  const store = useMeetingStore();

  return {
    ...storeToRefs(store),
  };
}

import { startRecording } from "@/core/screen-recording";
import { ref, shallowRef } from "vue";

function formatRecordingElapsed(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
}

export function useMessageComposerScreenRecording() {
  const isRecording = ref(false);
  const stopRecording = shallowRef<(() => void) | null>(null);
  const secondsElapsed = ref(0);
  const counter = ref<ReturnType<typeof setInterval> | null>(null);

  async function onToggleRecording() {
    if (!isRecording.value) {
      secondsElapsed.value = 0;
      isRecording.value = true;
      stopRecording.value = await startRecording();
      counter.value = setInterval(() => {
        secondsElapsed.value++;
      }, 1000);
    } else {
      counter.value && clearInterval(counter.value);
      counter.value = null;
      stopRecording.value?.();
      stopRecording.value = null;
      isRecording.value = false;
    }
  }

  return {
    isRecording,
    secondsElapsed,
    onToggleRecording,
    formatRecordingElapsed,
  };
}

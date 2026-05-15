import { defineStore } from "pinia";
import { computed, ref } from "vue";

const LS_CAMERA = "epicstory.meeting.cameraId";
const LS_MIC = "epicstory.meeting.micId";
const LS_SPEAKER = "epicstory.meeting.speakerId";

function readStored(id: string): string | null {
  try {
    return localStorage.getItem(id);
  } catch {
    return null;
  }
}

function writeStored(id: string, value: string | null) {
  try {
    if (value == null) localStorage.removeItem(id);
    else localStorage.setItem(id, value);
  } catch {
    /* ignore */
  }
}

/**
 * Enumerated devices + user selections for meeting A/V I/O.
 * Selections are persisted in localStorage for the next session.
 */
export const useMeetingMediaDevicesStore = defineStore("meetingMediaDevices", () => {
  const cameras = ref<MediaDeviceInfo[]>([]);
  const microphones = ref<MediaDeviceInfo[]>([]);
  const speakers = ref<MediaDeviceInfo[]>([]);

  const selectedCameraId = ref<string | null>(readStored(LS_CAMERA));
  const selectedMicId = ref<string | null>(readStored(LS_MIC));
  const selectedSpeakerId = ref<string | null>(readStored(LS_SPEAKER));

  const supportsSpeakerSelection = computed(() => {
    if (typeof HTMLMediaElement === "undefined") return false;
    return "setSinkId" in HTMLMediaElement.prototype;
  });

  let deviceWatcherAttached = false;

  function attachDeviceWatcher() {
    if (deviceWatcherAttached || typeof navigator === "undefined" || !navigator.mediaDevices) return;
    deviceWatcherAttached = true;
    navigator.mediaDevices.addEventListener("devicechange", () => {
      refreshDevices();
    });
  }

  function setSelectedCameraId(id: string | null) {
    selectedCameraId.value = id;
    writeStored(LS_CAMERA, id);
  }

  function setSelectedMicId(id: string | null) {
    selectedMicId.value = id;
    writeStored(LS_MIC, id);
  }

  function setSelectedSpeakerId(id: string | null) {
    selectedSpeakerId.value = id;
    writeStored(LS_SPEAKER, id);
  }

  function reconcileSelections() {
    const camSet = new Set(cameras.value.map((d) => d.deviceId));
    const micSet = new Set(microphones.value.map((d) => d.deviceId));
    const spkSet = new Set(speakers.value.map((d) => d.deviceId));

    if (selectedCameraId.value && !camSet.has(selectedCameraId.value)) {
      setSelectedCameraId(cameras.value[0]?.deviceId ?? null);
    }
    if (!selectedCameraId.value && cameras.value[0]) {
      setSelectedCameraId(cameras.value[0].deviceId);
    }

    if (selectedMicId.value && !micSet.has(selectedMicId.value)) {
      setSelectedMicId(microphones.value[0]?.deviceId ?? null);
    }
    if (!selectedMicId.value && microphones.value[0]) {
      setSelectedMicId(microphones.value[0].deviceId);
    }

    if (supportsSpeakerSelection.value) {
      if (selectedSpeakerId.value && !spkSet.has(selectedSpeakerId.value)) {
        setSelectedSpeakerId(speakers.value[0]?.deviceId ?? null);
      }
      if (!selectedSpeakerId.value && speakers.value[0]) {
        setSelectedSpeakerId(speakers.value[0].deviceId);
      }
    }
  }

  async function refreshDevices() {
    attachDeviceWatcher();
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const all = await navigator.mediaDevices.enumerateDevices();
    cameras.value = all.filter((d) => d.kind === "videoinput");
    microphones.value = all.filter((d) => d.kind === "audioinput");
    speakers.value = all.filter((d) => d.kind === "audiooutput");
    reconcileSelections();
  }

  /**
   * Opens a short-lived stream so labels populate (browser requirement), then re-enumerates.
   */
  async function ensurePermissionAndLabels() {
    attachDeviceWatcher();
    try {
      const tmp = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      tmp.getTracks().forEach((t) => t.stop());
    } catch {
      /* user may deny; enumerate still returns devices with empty labels */
    }
    await refreshDevices();
  }

  function streamConstraints(): MediaStreamConstraints {
    return {
      video: selectedCameraId.value ? { deviceId: { exact: selectedCameraId.value } } : true,
      audio: selectedMicId.value ? { deviceId: { exact: selectedMicId.value } } : true,
    };
  }

  function deviceLabel(d: MediaDeviceInfo) {
    return d.label || `${d.kind} (${d.deviceId.slice(0, 8)}…)`;
  }

  return {
    cameras,
    microphones,
    speakers,
    selectedCameraId,
    selectedMicId,
    selectedSpeakerId,
    supportsSpeakerSelection,
    refreshDevices,
    ensurePermissionAndLabels,
    streamConstraints,
    setSelectedCameraId,
    setSelectedMicId,
    setSelectedSpeakerId,
    deviceLabel,
  };
});

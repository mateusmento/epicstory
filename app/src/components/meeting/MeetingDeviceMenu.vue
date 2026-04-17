<script setup lang="ts">
import { Button } from "@/design-system";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from "@/design-system";
import { IconCameraOn, IconMicrophoneOn } from "@/components/icons";
import { useMeetingMediaDevicesStore } from "@/domain/channels/composables/meeting-media-devices";
import { storeToRefs } from "pinia";
import { Headphones, MoreVertical, RefreshCw, Settings2 } from "lucide-vue-next";
import { onMounted } from "vue";
import type { AcceptableValue } from "reka-ui";

withDefaults(
  defineProps<{
    /** Circular icon (meeting bar) or labeled button (lobby). */
    triggerVariant?: "control-circle" | "lobby-button";
    /** Where the root menu opens; meeting bar is usually `top`. */
    contentSide?: "top" | "bottom" | "left" | "right";
    contentAlign?: "start" | "center" | "end";
  }>(),
  {
    triggerVariant: "control-circle",
    contentSide: "top",
    contentAlign: "center",
  },
);

const emit = defineEmits<{
  (e: "input-devices-change"): void;
}>();

const deviceStore = useMeetingMediaDevicesStore();
const {
  cameras,
  microphones,
  speakers,
  selectedCameraId,
  selectedMicId,
  selectedSpeakerId,
  supportsSpeakerSelection,
} = storeToRefs(deviceStore);

const { refreshDevices, deviceLabel, setSelectedCameraId, setSelectedMicId, setSelectedSpeakerId } =
  deviceStore;

onMounted(() => {
  void refreshDevices();
});

async function onRefreshDevices() {
  await refreshDevices();
}

/** Keep dropdown open when refreshing device lists (reka-ui MenuItem `select`). */
function onRefreshSelect(e: Event) {
  e.preventDefault();
  void onRefreshDevices();
}

function pickCamera(v: AcceptableValue) {
  setSelectedCameraId(v != null && v !== "" ? String(v) : null);
  emit("input-devices-change");
}

function pickMic(v: AcceptableValue) {
  setSelectedMicId(v != null && v !== "" ? String(v) : null);
  emit("input-devices-change");
}

function pickSpeaker(v: AcceptableValue) {
  setSelectedSpeakerId(v != null && v !== "" ? String(v) : null);
}
</script>

<template>
  <Menu>
    <MenuTrigger as-child>
      <button
        v-if="triggerVariant === 'control-circle'"
        type="button"
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-none bg-slate-400/20 text-white backdrop-blur-sm outline-none ring-offset-background transition hover:bg-slate-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Camera, microphone, and speaker settings"
      >
        <MoreVertical class="h-5 w-5" aria-hidden="true" />
      </button>
      <Button
        v-else
        type="button"
        variant="outline"
        size="sm"
        class="gap-2 text-xs"
        aria-label="Camera, microphone, and speaker settings"
      >
        <Settings2 class="h-4 w-4 shrink-0" aria-hidden="true" />
        Audio &amp; video
      </Button>
    </MenuTrigger>

    <MenuContent
      :side="contentSide"
      :align="contentAlign"
      :side-offset="8"
      class="w-56 max-h-[min(70vh,24rem)] overflow-y-auto"
    >
      <!-- Camera -->
      <MenuSub>
        <MenuSubTrigger class="gap-2 text-sm">
          <IconCameraOn class="h-4 w-4 shrink-0" aria-hidden="true" />
          Camera
        </MenuSubTrigger>
        <MenuSubContent class="max-h-60 overflow-y-auto min-w-[12rem]">
          <template v-if="cameras.length === 0">
            <MenuLabel class="px-2 py-1.5 text-xs text-muted-foreground">No cameras found</MenuLabel>
          </template>
          <MenuRadioGroup v-else :model-value="selectedCameraId ?? ''" @update:model-value="pickCamera">
            <MenuRadioItem v-for="d in cameras" :key="d.deviceId" :value="d.deviceId" class="text-xs">
              <span class="truncate" :title="deviceLabel(d)">{{ deviceLabel(d) }}</span>
            </MenuRadioItem>
          </MenuRadioGroup>
          <MenuSeparator />
          <MenuItem class="gap-2 text-xs" @select="onRefreshSelect">
            <RefreshCw class="h-3.5 w-3.5 shrink-0" />
            Refresh device list
          </MenuItem>
        </MenuSubContent>
      </MenuSub>

      <!-- Microphone -->
      <MenuSub>
        <MenuSubTrigger class="gap-2 text-sm">
          <IconMicrophoneOn class="h-4 w-4 shrink-0" aria-hidden="true" />
          Microphone
        </MenuSubTrigger>
        <MenuSubContent class="max-h-60 overflow-y-auto min-w-[12rem]">
          <template v-if="microphones.length === 0">
            <MenuLabel class="px-2 py-1.5 text-xs text-muted-foreground">No microphones found</MenuLabel>
          </template>
          <MenuRadioGroup v-else :model-value="selectedMicId ?? ''" @update:model-value="pickMic">
            <MenuRadioItem v-for="d in microphones" :key="d.deviceId" :value="d.deviceId" class="text-xs">
              <span class="truncate" :title="deviceLabel(d)">{{ deviceLabel(d) }}</span>
            </MenuRadioItem>
          </MenuRadioGroup>
          <MenuSeparator />
          <MenuItem class="gap-2 text-xs" @select="onRefreshSelect">
            <RefreshCw class="h-3.5 w-3.5 shrink-0" />
            Refresh device list
          </MenuItem>
        </MenuSubContent>
      </MenuSub>

      <!-- Speaker -->
      <MenuSub v-if="supportsSpeakerSelection">
        <MenuSubTrigger class="gap-2 text-sm">
          <Headphones class="h-4 w-4 shrink-0" aria-hidden="true" />
          Speaker
        </MenuSubTrigger>
        <MenuSubContent class="max-h-60 overflow-y-auto min-w-[12rem]">
          <template v-if="speakers.length === 0">
            <MenuLabel class="px-2 py-1.5 text-xs text-muted-foreground">No speakers found</MenuLabel>
          </template>
          <MenuRadioGroup v-else :model-value="selectedSpeakerId ?? ''" @update:model-value="pickSpeaker">
            <MenuRadioItem v-for="d in speakers" :key="d.deviceId" :value="d.deviceId" class="text-xs">
              <span class="truncate" :title="deviceLabel(d)">{{ deviceLabel(d) }}</span>
            </MenuRadioItem>
          </MenuRadioGroup>
          <MenuSeparator />
          <MenuItem class="gap-2 text-xs" @select="onRefreshSelect">
            <RefreshCw class="h-3.5 w-3.5 shrink-0" />
            Refresh device list
          </MenuItem>
        </MenuSubContent>
      </MenuSub>
    </MenuContent>
  </Menu>
</template>

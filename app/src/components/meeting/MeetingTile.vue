<script setup lang="ts">
import { IconCameraOff, IconMicrophoneOff } from "@/components/icons";
import { cn } from "@/design-system/utils";
import type { MeetingParticipant } from "@/domain/channels/composables/meeting-layout";
import { Pin } from "lucide-vue-next";
import { computed, ref } from "vue";
import { useMediaStreamVideo } from "./composables/useMediaStreamVideo";

const props = defineProps<{
  participant: MeetingParticipant;
  speaking?: boolean;
  pinned?: boolean;
  variant?: "grid" | "dock" | "featured";
  class?: string;
  title?: string;
}>();

const emit = defineEmits<{
  (e: "click"): void;
}>();

const displayName = computed(
  () => props.participant.user?.name ?? (props.participant.isLocal ? "You" : "Unknown"),
);

const avatarClass = computed(() => {
  if (props.variant === "dock") return "w-10 h-10 text-lg";
  if (props.variant === "featured") return "w-32 h-32 text-2xl";
  return "w-16 h-16 text-2xl";
});

const videoEl = ref<HTMLVideoElement | null>(null);
useMediaStreamVideo(
  videoEl,
  computed(() => props.participant.stream),
  computed(() => props.participant.isCameraOn),
);

function initial() {
  const n = props.participant.user?.name?.trim?.();
  return n?.charAt(0)?.toUpperCase?.() || "?";
}
</script>

<template>
  <div
    :class="
      cn(
        'relative overflow-hidden bg-black cursor-pointer select-none',
        speaking ? 'ring-2 ring-emerald-400/80' : 'ring-0',
        pinned ? 'outline outline-2 outline-amber-300/70' : '',
        props.class,
      )
    "
    :title="title"
    @click="emit('click')"
  >
    <video
      v-if="participant.stream && participant.isCameraOn"
      class="w-full h-full object-cover"
      autoplay
      :muted="participant.isLocal"
      playsinline
      ref="videoEl"
    />

    <div v-else class="w-full h-full flex items-center justify-center bg-gray-800">
      <img
        v-if="participant.user?.picture"
        :src="participant.user.picture"
        :alt="displayName"
        class="rounded-full object-cover"
        :class="avatarClass"
      />
      <div
        v-else
        class="rounded-full bg-gray-600 flex items-center justify-center text-white font-semibold"
        :class="avatarClass"
      >
        {{ initial() }}
      </div>
    </div>

    <!-- Bottom nameplate -->
    <div
      class="absolute bottom-2 left-2 text-white/90 bg-black/40 px-2 py-1 rounded"
      :class="variant === 'dock' ? 'text-[10px]' : 'text-xs'"
    >
      {{ displayName }}
    </div>

    <!-- Top-right status badges -->
    <div class="absolute top-2 right-2 flex items-center gap-1">
      <div
        v-if="!participant.isMicrophoneOn"
        class="backdrop-blur-sm bg-black/40 rounded-md p-1 text-white/90"
        title="Muted"
      >
        <IconMicrophoneOff class="w-4 h-4" />
      </div>
      <div
        v-if="!participant.isCameraOn"
        class="backdrop-blur-sm bg-black/40 rounded-md p-1 text-white/90"
        title="Camera off"
      >
        <IconCameraOff class="w-4 h-4" />
      </div>
      <div
        v-if="pinned"
        class="backdrop-blur-sm bg-black/40 rounded-md p-1 text-white/90 flex items-center gap-1"
        title="Pinned"
      >
        <Pin class="w-4 h-4" />
      </div>
    </div>
  </div>
</template>

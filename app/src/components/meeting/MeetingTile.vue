<script setup lang="ts">
import { UserAvatar, type UserAvatarSize } from "@/components/user";
import { IconCameraOff, IconMicrophoneOff } from "@/components/icons";
import { cn } from "@/design-system/utils";
import type { MeetingParticipant } from "@/domain/channels/composables/meeting-layout";
import {
  isPresentationLikeVideoTrack,
  meetingTileVisualStreams,
  type MeetingTileRole,
  partitionMeetingVideoTracks,
} from "@/domain/channels/utils/meeting-screen-share";
import { Monitor, Pin } from "lucide-vue-next";
import { computed, ref } from "vue";
import { useMediaStreamVideo } from "./composables/useMediaStreamVideo";

const props = defineProps<{
  participant: MeetingParticipant;
  /** How this tile is used in the layout (drives screen vs camera vs PiP). */
  tileRole: MeetingTileRole;
  speaking?: boolean;
  pinned?: boolean;
  variant?: "grid" | "dock" | "featured";
  class?: string;
  title?: string;
  /** When set (remote tiles only), routes playback to this output device if the browser supports `setSinkId`. */
  audioOutputDeviceId?: string | null;
}>();

const emit = defineEmits<{
  (e: "click"): void;
}>();

const displayName = computed(
  () => props.participant.user?.name ?? (props.participant.isLocal ? "You" : "Unknown"),
);

const meetingAvatarSize = computed<UserAvatarSize>(() => {
  if (props.variant === "dock") return "lg";
  if (props.variant === "featured") return "tileXl";
  return "tile";
});

const visuals = computed(() =>
  meetingTileVisualStreams(props.participant.stream, props.participant.isCameraOn, props.tileRole),
);

const mainVisualStream = computed(() => visuals.value.main);
const pipVisualStream = computed(() => visuals.value.pip);

const mainVideoEnabled = computed(() =>
  (mainVisualStream.value?.getVideoTracks() ?? []).some((t) => t.readyState === "live"),
);
const pipVideoEnabled = computed(() =>
  (pipVisualStream.value?.getVideoTracks() ?? []).some((t) => t.readyState === "live"),
);

const mainVideoPreserveAspect = computed(() => {
  if (props.participant.isScreenSharing) return true;
  const t = mainVisualStream.value?.getVideoTracks()[0];
  return t ? isPresentationLikeVideoTrack(t) : false;
});

const hasLiveScreenTrack = computed(() => {
  if (props.participant.isScreenSharing) return true;
  const { screen } = partitionMeetingVideoTracks(props.participant.stream);
  return !!screen && screen.readyState === "live";
});

const videoEl = ref<HTMLVideoElement | null>(null);
const pipVideoEl = ref<HTMLVideoElement | null>(null);

useMediaStreamVideo(
  videoEl,
  mainVisualStream,
  mainVideoEnabled,
  computed(() => (props.participant.isLocal ? null : (props.audioOutputDeviceId ?? null))),
);

useMediaStreamVideo(
  pipVideoEl,
  pipVisualStream,
  pipVideoEnabled,
  computed(() => null),
);

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
    <!-- Featured + presentation: 16:9 frame inside the stage so letterboxing matches tile aspect ratio. -->
    <div
      v-if="mainVideoEnabled && mainVideoPreserveAspect && variant === 'featured'"
      class="flex h-full w-full min-h-0 items-center justify-center"
    >
      <div
        class="aspect-video h-auto max-h-full w-full max-w-full min-w-0 overflow-hidden rounded-3xl bg-black"
      >
        <video
          class="h-full w-full object-contain"
          autoplay
          :muted="participant.isLocal"
          playsinline
          ref="videoEl"
        />
      </div>
    </div>
    <video
      v-else-if="mainVideoEnabled"
      class="w-full h-full"
      :class="mainVideoPreserveAspect ? 'object-contain bg-black' : 'object-cover'"
      autoplay
      :muted="participant.isLocal"
      playsinline
      ref="videoEl"
    />

    <video
      v-if="pipVideoEnabled"
      class="absolute bottom-12 right-2 z-10 w-[22%] min-w-[72px] max-w-[200px] aspect-video rounded-lg border-2 border-white/20 shadow-lg object-cover bg-black"
      autoplay
      :muted="participant.isLocal"
      playsinline
      ref="pipVideoEl"
    />

    <div v-if="!mainVideoEnabled" class="w-full h-full flex items-center justify-center bg-gray-800">
      <UserAvatar
        :name="participant.user?.name ?? displayName"
        :picture="participant.user?.picture"
        :size="meetingAvatarSize"
        variant="meetingDark"
        :title="displayName"
      />
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
        v-if="hasLiveScreenTrack"
        class="backdrop-blur-sm bg-black/40 rounded-md p-1 text-white/90"
        title="Sharing screen"
      >
        <Monitor class="w-4 h-4" />
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

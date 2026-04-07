<script lang="tsx" setup>
import { useAuth } from "@/domain/auth";
import { useMeeting } from "@/domain/channels";
import type { User } from "@/domain/user";
import { computed } from "vue";
import MeetingControls from "./MeetingControls.vue";
import { Pin } from "lucide-vue-next";
import { Button } from "@/design-system";

const { user } = useAuth();

const {
  mycamera,
  attendees,
  isCameraOn,
  isMicrophoneOn,
  leaveMeeting,
  endMeeting,
  stopCamera,
  stopMicrophone,
  currentMeetingChannelType,
  speakingIds,
  activeSpeakerId,
  pinnedSpeakerId,
  togglePinSpeaker,
  layoutMode,
  peersDock,
  topDockMax,
  setLayoutMode,
} = useMeeting();

const canEndMeeting = computed(() => currentMeetingChannelType.value !== "meeting");

type Participant = {
  id: string; // remoteId or "local"
  stream: MediaStream | null;
  user: User | null;
  isLocal: boolean;
  isCameraOn: boolean;
};

const participants = computed<Participant[]>(() => {
  const list: Participant[] = [];
  list.push({
    id: "local",
    stream: mycamera.value ?? null,
    user: user.value ?? null,
    isLocal: true,
    isCameraOn: !!mycamera.value && !!isCameraOn.value,
  });

  for (const a of attendees.value) {
    list.push({
      id: a.remoteId,
      stream: a.camera,
      user: a.user ?? null,
      isLocal: false,
      isCameraOn: !!a.isCameraOn,
    });
  }
  return list;
});

function findParticipant(id: string | null | undefined) {
  if (!id) return null;
  return participants.value.find((p) => p.id === id) ?? null;
}

const featured = computed<Participant>(() => {
  return (
    findParticipant(pinnedSpeakerId.value) ?? findParticipant(activeSpeakerId.value) ?? participants.value[0] // local as stable fallback
  );
});

const others = computed(() => participants.value.filter((p) => p.id !== featured.value.id));

const topDockPeers = computed(() => {
  if (layoutMode.value !== "speaker") return [];
  if (peersDock.value === "right") return [];
  if (peersDock.value === "top") return others.value;
  return others.value.slice(0, topDockMax.value);
});

const rightDockPeers = computed(() => {
  if (layoutMode.value !== "speaker") return [];
  if (peersDock.value === "top") return [];
  if (peersDock.value === "right") return others.value;
  return others.value.slice(topDockMax.value);
});

function isSpeaking(id: string) {
  return speakingIds.value?.has?.(id) ?? false;
}
</script>

<script lang="tsx">
function AttendeeBlankPicture({ user }: { user: User }) {
  return (
    <>
      <div class="rounded-3xl w-full h-full object-cover flex items-center justify-center bg-gray-800">
        {user?.picture ? (
          <img src={user.picture} alt={user.name} class="w-32 h-32 rounded-full object-cover" />
        ) : (
          <div class="w-32 h-32 rounded-full bg-gray-600 flex items-center justify-center text-white text-2xl font-semibold">
            {user?.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
        )}
      </div>
      <div class="absolute bottom-28 left-1/2 -translate-x-1/2 backdrop-blur-sm bg-[#dddddd44] px-2 py-1 rounded-lg text-white">
        {user.name}
      </div>
    </>
  );
}
</script>

<template>
  <section class="relative h-full w-full p-3 min-h-0 flex flex-col gap-3">
    <!-- Mode switch -->
    <div
      class="sticky top-0 z-20 -mx-3 px-3 py-2 flex items-center gap-2 bg-background/85 backdrop-blur border-b"
    >
      <Button
        type="button"
        size="sm"
        :variant="layoutMode === 'speaker' ? 'secondary' : 'ghost'"
        @click="setLayoutMode('speaker')"
      >
        Speaker
      </Button>
      <Button
        type="button"
        size="sm"
        :variant="layoutMode === 'grid' ? 'secondary' : 'ghost'"
        @click="setLayoutMode('grid')"
      >
        Grid
      </Button>

      <div class="flex-1" />

      <div v-if="layoutMode === 'speaker'" class="text-xs text-muted-foreground select-none">
        Tip: click a tile to pin/unpin
      </div>
      <div v-else class="text-xs text-muted-foreground select-none">
        Tip: click a tile to pin (switches to Speaker)
      </div>
    </div>

    <!-- Speaker focus mode -->
    <div v-if="layoutMode === 'speaker'" class="flex flex-col flex-1 min-h-0 gap-3">
      <!-- Top dock -->
      <div v-if="topDockPeers.length" class="overflow-x-auto px-2">
        <!-- Inner container centers when content fits, but still scrolls when it doesn't -->
        <div class="flex items-center justify-center gap-2 w-max min-w-full">
          <div
            v-for="p in topDockPeers"
            :key="p.id"
            class="relative shrink-0 w-56 aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black cursor-pointer select-none"
            :class="[
              isSpeaking(p.id) ? 'ring-2 ring-emerald-400/80' : 'ring-0',
              pinnedSpeakerId === p.id ? 'outline outline-2 outline-amber-300/70' : '',
            ]"
            @click="togglePinSpeaker(p.id)"
            :title="pinnedSpeakerId === p.id ? 'Unpin' : 'Pin (disable auto-switch)'"
          >
            <video
              v-if="p.stream && p.isCameraOn"
              class="w-full h-full object-cover"
              autoplay
              :muted="p.isLocal"
              playsinline
              :ref="(el) => el && ((el as HTMLVideoElement).srcObject = p.stream)"
            />
            <div v-else class="w-full h-full flex items-center justify-center bg-gray-800">
              <img
                v-if="p.user?.picture"
                :src="p.user.picture"
                :alt="p.user.name"
                class="w-10 h-10 rounded-full object-cover"
              />
              <div
                v-else
                class="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white text-lg font-semibold"
              >
                {{ p.user?.name?.charAt(0)?.toUpperCase() || "?" }}
              </div>
            </div>
            <div class="absolute bottom-2 left-2 text-[10px] text-white/90 bg-black/40 px-2 py-0.5 rounded">
              {{ p.user?.name ?? (p.isLocal ? "You" : "Unknown") }}
            </div>
          </div>
        </div>
      </div>

      <!-- Center stage + right dock -->
      <div class="flex flex-1 min-h-0 gap-3">
        <div class="relative flex-1 min-h-0">
          <div
            class="relative w-full h-full rounded-3xl overflow-hidden bg-black cursor-pointer select-none"
            :class="[
              isSpeaking(featured.id) ? 'ring-4 ring-emerald-400/80' : 'ring-0',
              pinnedSpeakerId === featured.id ? 'outline outline-2 outline-amber-300/70' : '',
            ]"
            @click="togglePinSpeaker(featured.id)"
            :title="pinnedSpeakerId === featured.id ? 'Unpin' : 'Pin (disable auto-switch)'"
          >
            <video
              v-if="featured.stream && featured.isCameraOn"
              class="w-full h-full object-cover"
              autoplay
              :muted="featured.isLocal"
              playsinline
              :ref="(el) => el && ((el as HTMLVideoElement).srcObject = featured.stream)"
            />
            <AttendeeBlankPicture v-else :user="(featured.user ?? user)!" />

            <div
              v-if="featured.user?.name"
              class="absolute bottom-28 left-1/2 -translate-x-1/2 backdrop-blur-sm bg-[#dddddd44] px-2 py-1 rounded-lg text-white"
            >
              {{ featured.user.name }}
            </div>

            <div
              v-if="pinnedSpeakerId === featured.id"
              class="absolute top-4 left-4 backdrop-blur-sm bg-[#dddddd44] px-2 py-1 rounded-lg text-white flex items-center gap-2"
            >
              <Pin class="w-4 h-4" />
              <div class="text-xs">Pinned</div>
            </div>
          </div>

          <div class="absolute left-1/2 -translate-x-1/2 bottom-8">
            <MeetingControls
              :isCameraOn="isCameraOn"
              :isMicrophoneOn="isMicrophoneOn"
              :showEnd="canEndMeeting"
              @toggle-camera="stopCamera"
              @toggle-microphone="stopMicrophone"
              @leave-meeting="leaveMeeting"
              @end-meeting="endMeeting"
            />
          </div>
        </div>

        <div
          v-if="rightDockPeers.length"
          class="w-64 shrink-0 min-h-0 overflow-y-auto pr-1 flex flex-col gap-2"
        >
          <div
            v-for="p in rightDockPeers"
            :key="p.id"
            class="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black cursor-pointer select-none"
            :class="[
              isSpeaking(p.id) ? 'ring-2 ring-emerald-400/80' : 'ring-0',
              pinnedSpeakerId === p.id ? 'outline outline-2 outline-amber-300/70' : '',
            ]"
            @click="togglePinSpeaker(p.id)"
            :title="pinnedSpeakerId === p.id ? 'Unpin' : 'Pin (disable auto-switch)'"
          >
            <video
              v-if="p.stream && p.isCameraOn"
              class="w-full h-full object-cover"
              autoplay
              :muted="p.isLocal"
              playsinline
              :ref="(el) => el && ((el as HTMLVideoElement).srcObject = p.stream)"
            />
            <div v-else class="w-full h-full flex items-center justify-center bg-gray-800">
              <img
                v-if="p.user?.picture"
                :src="p.user.picture"
                :alt="p.user.name"
                class="w-10 h-10 rounded-full object-cover"
              />
              <div
                v-else
                class="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white text-lg font-semibold"
              >
                {{ p.user?.name?.charAt(0)?.toUpperCase() || "?" }}
              </div>
            </div>
            <div class="absolute bottom-2 left-2 text-[10px] text-white/90 bg-black/40 px-2 py-0.5 rounded">
              {{ p.user?.name ?? (p.isLocal ? "You" : "Unknown") }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Equal grid mode -->
    <div
      v-else
      class="flex-1 min-h-0 overflow-auto pb-24 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))] content-start"
    >
      <div
        v-for="p in participants"
        :key="p.id"
        class="relative aspect-video rounded-2xl overflow-hidden bg-black cursor-pointer select-none"
        :class="[
          isSpeaking(p.id) ? 'ring-2 ring-emerald-400/80' : 'ring-0',
          pinnedSpeakerId === p.id ? 'outline outline-2 outline-amber-300/70' : '',
        ]"
        @click="togglePinSpeaker(p.id)"
        :title="pinnedSpeakerId === p.id ? 'Unpin' : 'Pin (switches to Speaker focus)'"
      >
        <video
          v-if="p.stream && p.isCameraOn"
          class="w-full h-full object-cover"
          autoplay
          :muted="p.isLocal"
          playsinline
          :ref="(el) => el && ((el as HTMLVideoElement).srcObject = p.stream)"
        />
        <div v-else class="w-full h-full flex items-center justify-center bg-gray-800">
          <img
            v-if="p.user?.picture"
            :src="p.user.picture"
            :alt="p.user.name"
            class="w-16 h-16 rounded-full object-cover"
          />
          <div
            v-else
            class="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center text-white text-2xl font-semibold"
          >
            {{ p.user?.name?.charAt(0)?.toUpperCase() || "?" }}
          </div>
        </div>

        <div class="absolute bottom-2 left-2 text-xs text-white/90 bg-black/40 px-2 py-1 rounded">
          {{ p.user?.name ?? (p.isLocal ? "You" : "Unknown") }}
        </div>

        <div
          v-if="pinnedSpeakerId === p.id"
          class="absolute top-2 left-2 backdrop-blur-sm bg-[#dddddd44] px-2 py-1 rounded-lg text-white flex items-center gap-2"
        >
          <Pin class="w-4 h-4" />
          <div class="text-xs">Pinned</div>
        </div>
      </div>
    </div>

    <!-- Meeting controls (grid mode overlay) -->
    <div
      v-if="layoutMode === 'grid'"
      class="absolute left-1/2 -translate-x-1/2 bottom-6 z-30"
    >
      <MeetingControls
        :isCameraOn="isCameraOn"
        :isMicrophoneOn="isMicrophoneOn"
        :showEnd="canEndMeeting"
        @toggle-camera="stopCamera"
        @toggle-microphone="stopMicrophone"
        @leave-meeting="leaveMeeting"
        @end-meeting="endMeeting"
      />
    </div>
  </section>
</template>

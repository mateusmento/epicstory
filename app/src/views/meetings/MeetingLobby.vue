<script setup lang="ts">
import { useDependency } from "@/core/dependency-injection";
import { Button } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { CalendarEventApi } from "@/domain/calendar";
import { useMeeting } from "@/domain/channels";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const calendarEventApi = useDependency(CalendarEventApi);
const { joinMeeting, joinScheduledMeeting, isCameraOn, isMicrophoneOn } = useMeeting();

const workspaceId = computed(() => (route.params.workspaceId ? +route.params.workspaceId : undefined));
const meetingId = computed(() => (route.query.meetingId ? +route.query.meetingId : undefined));
const calendarEventId = computed(() =>
  route.query.calendarEventId ? String(route.query.calendarEventId) : undefined,
);
const occurrenceAt = computed(() => {
  const raw = route.query.occurrenceAt;
  const str = Array.isArray(raw) ? raw[0] : raw;
  const d = str ? new Date(String(str)) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
});

const isLoading = ref(false);
const lobby = ref<any | null>(null);

const previewStream = ref<MediaStream | null>(null);
const videoEl = ref<HTMLVideoElement | null>(null);

const canPreview = ref(true);

async function fetchMeeting() {
  isLoading.value = true;
  try {
    lobby.value = null;

    if (meetingId.value) {
      lobby.value = await calendarEventApi.getMeetingLobby({ meetingId: meetingId.value });
      isLoading.value = false;
      return;
    }

    if (calendarEventId.value && occurrenceAt.value) {
      lobby.value = await calendarEventApi.getMeetingLobby({
        calendarEventId: calendarEventId.value,
        occurrenceAt: occurrenceAt.value,
      });
      isLoading.value = false;
      return;
    }
  } finally {
    isLoading.value = false;
  }
}

async function setupPreview() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    previewStream.value = stream;
    isCameraOn.value = true;
    isMicrophoneOn.value = true;
  } catch {
    canPreview.value = false;
  }
}

function teardownPreview() {
  previewStream.value?.getTracks().forEach((t) => t.stop());
  previewStream.value = null;
}

watch(
  [previewStream, videoEl],
  () => {
    if (!videoEl.value) return;
    (videoEl.value as any).srcObject = previewStream.value;
  },
  { immediate: true },
);

function toggleCamera() {
  const track = previewStream.value?.getVideoTracks()?.[0];
  if (!track) return;
  isCameraOn.value = !isCameraOn.value;
  track.enabled = isCameraOn.value;
}

function toggleMic() {
  const track = previewStream.value?.getAudioTracks()?.[0];
  if (!track) return;
  isMicrophoneOn.value = !isMicrophoneOn.value;
  track.enabled = isMicrophoneOn.value;
}

async function join() {
  const meeting = await (() => {
    if (occurrenceAt.value && calendarEventId.value) {
      console.log({
        calendarEventId: calendarEventId.value,
        occurrenceAt: occurrenceAt.value,
      });
      return joinScheduledMeeting({
        calendarEventId: calendarEventId.value,
        occurrenceAt: occurrenceAt.value,
        camera: previewStream.value ?? undefined,
      });
    }
    if (meetingId.value) {
      return joinMeeting({ meetingId: meetingId.value, camera: previewStream.value ?? undefined });
    }
  })();

  if (!meeting) return;

  // Preview is now owned by meeting streaming, don't stop tracks here.
  previewStream.value = null;
  router.push({ name: "meeting-session", params: { workspaceId: workspaceId.value, meetingId: meeting.id } });
}

async function cancelSeries() {
  if (calendarEventId.value) {
    await calendarEventApi.removeCalendarEvent(calendarEventId.value);
    router.push({ name: "schedule", params: { workspaceId: workspaceId.value } });
  }
}

onMounted(async () => {
  await fetchMeeting();
  await setupPreview();
});

onUnmounted(() => {
  teardownPreview();
});

const title = computed(() => lobby.value?.calendarEvent?.title ?? "Meeting");
const participants = computed(() => lobby.value?.calendarEvent?.participants ?? []);
const joined = computed(() => lobby.value?.meeting?.attendees ?? []);
</script>

<template>
  <div class="w-full h-full px-6 py-6 overflow-auto bg-muted/20">
    <div class="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
      <div class="rounded-xl border bg-white p-4">
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="text-xs text-muted-foreground">Scheduled meeting</div>
            <div class="text-lg font-semibold text-foreground">{{ title }}</div>
          </div>
          <Button variant="outline" size="sm" @click="router.back()">Back</Button>
        </div>

        <div
          class="mt-4 rounded-lg border bg-black overflow-hidden aspect-video flex items-center justify-center"
        >
          <video
            v-if="canPreview"
            ref="videoEl"
            autoplay
            playsinline
            muted
            class="w-full h-full object-cover"
          />
          <div v-else class="text-sm text-white/80">Camera preview unavailable</div>
        </div>

        <div class="mt-3 flex items-center gap-2">
          <Button variant="destructive" size="sm" @click="cancelSeries"> Cancel series </Button>
          <Button variant="outline" size="sm" @click="toggleCamera" :disabled="!previewStream">
            <Icon :name="isCameraOn ? 'bi-camera-video' : 'bi-camera-video-off'" class="mr-2" />
            {{ isCameraOn ? "Camera on" : "Camera off" }}
          </Button>
          <Button variant="outline" size="sm" @click="toggleMic" :disabled="!previewStream">
            <Icon :name="isMicrophoneOn ? 'bi-mic' : 'bi-mic-mute'" class="mr-2" />
            {{ isMicrophoneOn ? "Mic on" : "Mic off" }}
          </Button>

          <div class="flex-1" />

          <Button
            size="sm"
            @click="join"
            :disabled="isLoading || (!occurrenceAt && !meetingId) || !lobby?.joinable"
          >
            Join meeting
          </Button>
        </div>

        <div v-if="!lobby?.joinable" class="mt-2 text-xs text-muted-foreground">
          Meeting will be joinable at the scheduled start time.
        </div>
      </div>

      <div class="rounded-xl border bg-white p-4">
        <div class="text-sm font-semibold">Participants</div>
        <div class="mt-2 flex flex-wrap gap-2">
          <div
            v-for="p in participants"
            :key="p.id"
            class="flex items-center gap-2 rounded-full border px-2 py-1"
          >
            <img v-if="p.picture" :src="p.picture" class="w-5 h-5 rounded-full" />
            <div class="text-xs">{{ p.name }}</div>
          </div>
          <div v-if="participants.length === 0" class="text-xs text-muted-foreground">No participants</div>
        </div>

        <div class="mt-4 text-sm font-semibold">Joined</div>
        <div class="mt-2 flex flex-wrap gap-2">
          <div
            v-for="a in joined"
            :key="a.remoteId"
            class="flex items-center gap-2 rounded-full border px-2 py-1"
          >
            <img v-if="a.user?.picture" :src="a.user.picture" class="w-5 h-5 rounded-full" />
            <div class="text-xs">{{ a.user?.name ?? "Unknown" }}</div>
          </div>
          <div v-if="joined.length === 0" class="text-xs text-muted-foreground">Nobody joined yet</div>
        </div>
      </div>
    </div>
  </div>
</template>

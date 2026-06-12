import { Button, Separator } from "@/design-system";
import {
  storyMeetingGridLayout,
  storyMeetingParticipants,
  storyMeetingSpeakerLayout,
} from "@/presentationals/stories/fixtures";
import MeetingControls from "@/presentationals/meeting/MeetingControls.vue";
import MeetingGrid from "@/presentationals/meeting/MeetingGrid.vue";
import MeetingSpeakerView from "@/presentationals/meeting/MeetingSpeakerView.vue";
import { DeviceMenuStub } from "@/presentationals/stories/stubs/DeviceMenuStub";
import { computed, defineComponent, ref } from "vue";

export const MeetingRoomHarness = defineComponent({
  name: "MeetingRoomHarness",
  components: { Button, Separator, MeetingGrid, MeetingSpeakerView, MeetingControls, DeviceMenuStub },
  setup() {
    const layoutMode = ref<"grid" | "speaker">("grid");
    const gridPage = ref(1);
    const pinnedId = ref<string | null>(null);
    const isCameraOn = ref(true);
    const isMicrophoneOn = ref(true);
    const isScreenSharing = ref(false);
    const actionLabel = ref("none");

    const participants = ref([...storyMeetingParticipants]);

    const gridLayout = computed(() => ({
      ...storyMeetingGridLayout,
      participants: participants.value,
      pinnedId: pinnedId.value,
    }));

    const speakerLayout = computed(() => ({
      ...storyMeetingSpeakerLayout,
      pinnedId: pinnedId.value,
    }));

    function togglePin(participantId: string) {
      pinnedId.value = pinnedId.value === participantId ? null : participantId;
      if (pinnedId.value) layoutMode.value = "speaker";
    }

    function mark(action: string) {
      actionLabel.value = action;
    }

    return {
      layoutMode,
      gridPage,
      gridLayout,
      speakerLayout,
      isCameraOn,
      isMicrophoneOn,
      isScreenSharing,
      togglePin,
      mark,
      actionLabel,
    };
  },
  template: `
    <section class="relative flex h-full min-h-[560px] w-full flex-col bg-black text-white">
      <div class="sticky top-0 z-20 flex min-h-10 flex-wrap items-center gap-2 px-3 py-2">
        <Button
          type="button"
          size="icon"
          class="px-2 text-xs"
          :variant="layoutMode === 'speaker' ? 'secondary' : 'ghost'"
          @click="layoutMode = 'speaker'"
        >
          Speaker
        </Button>
        <Button
          type="button"
          size="icon"
          class="px-2 text-xs"
          :variant="layoutMode === 'grid' ? 'secondary' : 'ghost'"
          @click="layoutMode = 'grid'"
        >
          Grid
        </Button>
        <div class="flex-1" />
        <div class="text-xs text-white/60 select-none">
          {{ layoutMode === 'speaker' ? 'Tip: click a tile to pin/unpin' : 'Tip: click a tile to pin (switches to Speaker)' }}
        </div>
      </div>
      <Separator class="bg-white/10" />

      <div class="relative min-h-0 flex-1 p-3">
        <MeetingSpeakerView
          v-if="layoutMode === 'speaker'"
          class="h-full"
          :layout="speakerLayout"
          @toggle-pin="togglePin"
        />
        <MeetingGrid
          v-else
          v-model:page="gridPage"
          class="h-full"
          :layout="gridLayout"
          @toggle-pin="togglePin"
        />

        <div class="absolute bottom-6 left-1/2 z-30 -translate-x-1/2">
          <MeetingControls
            :is-camera-on="isCameraOn"
            :is-microphone-on="isMicrophoneOn"
            :is-screen-sharing="isScreenSharing"
            @toggle-camera="isCameraOn = !isCameraOn; mark('toggle-camera')"
            @toggle-microphone="isMicrophoneOn = !isMicrophoneOn; mark('toggle-microphone')"
            @toggle-screen-share="isScreenSharing = !isScreenSharing; mark('toggle-screen-share')"
            @apply-input-devices="mark('apply-input-devices')"
            @leave-meeting="mark('leave-meeting')"
            @end-meeting="mark('end-meeting')"
          >
            <template #device-menu>
              <DeviceMenuStub />
            </template>
          </MeetingControls>
        </div>
      </div>

      <div class="px-3 pb-2 text-xs text-white/70">Last control: {{ actionLabel }}</div>
    </section>
  `,
});

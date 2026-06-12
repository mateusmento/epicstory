import type { Meta, StoryObj } from "@storybook/vue3";
import { computed, ref } from "vue";
import MeetingGrid from "../MeetingGrid.vue";
import { storyMeetingGridLayout, storyMeetingParticipants } from "@/presentationals/stories/fixtures";

const meta = {
  title: "Presentational/Meeting/MeetingGrid",
  component: MeetingGrid,
  tags: ["autodocs"],
  decorators: [() => ({ template: '<div class="w-[960px] h-[560px] p-4 bg-black"><story /></div>' })],
} satisfies Meta<typeof MeetingGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { MeetingGrid },
    setup() {
      const page = ref(1);
      const pinnedId = ref<string | null>(storyMeetingGridLayout.pinnedId);
      const participants = ref([
        ...storyMeetingParticipants,
        ...storyMeetingParticipants.map((participant, index) => ({
          ...participant,
          id: `clone-${index}`,
          isLocal: false,
          streamEpoch: participant.streamEpoch + index + 1,
        })),
      ]);

      const layout = computed(() => ({
        ...storyMeetingGridLayout,
        participants: participants.value,
        pinnedId: pinnedId.value,
      }));

      function onTogglePin(participantId: string) {
        pinnedId.value = pinnedId.value === participantId ? null : participantId;
      }

      return { page, layout, pinnedId, onTogglePin };
    },
    template: `
      <div class="h-full flex flex-col gap-2">
        <MeetingGrid
          v-model:page="page"
          class="h-full"
          :layout="layout"
          @toggle-pin="onTogglePin"
        />
        <div class="text-xs text-white/80">Page {{ page }} · Pinned: {{ pinnedId ?? 'none' }}</div>
      </div>
    `,
  }),
};

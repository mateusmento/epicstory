import type { Meta, StoryObj } from "@storybook/vue3";
import { computed, ref } from "vue";
import MeetingSpeakerView from "../MeetingSpeakerView.vue";
import { storyMeetingSpeakerLayout } from "@/presentationals/stories/fixtures";

const meta = {
  title: "Presentational/Meeting/MeetingSpeakerView",
  component: MeetingSpeakerView,
  tags: ["autodocs"],
  decorators: [() => ({ template: '<div class="w-[960px] h-[560px] p-4 bg-black"><story /></div>' })],
} satisfies Meta<typeof MeetingSpeakerView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { MeetingSpeakerView },
    setup() {
      const pinnedId = ref<string | null>(storyMeetingSpeakerLayout.pinnedId);

      const layout = computed(() => ({
        ...storyMeetingSpeakerLayout,
        pinnedId: pinnedId.value,
      }));

      function onTogglePin(participantId: string) {
        pinnedId.value = pinnedId.value === participantId ? null : participantId;
      }

      return { layout, pinnedId, onTogglePin };
    },
    template: `
      <div class="h-full flex flex-col gap-2">
        <MeetingSpeakerView class="h-full" :layout="layout" @toggle-pin="onTogglePin" />
        <div class="text-xs text-white/80">Pinned: {{ pinnedId ?? 'none' }}</div>
      </div>
    `,
  }),
};

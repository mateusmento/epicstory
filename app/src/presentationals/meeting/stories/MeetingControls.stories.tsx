import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import MeetingControls from "../MeetingControls.vue";
import { DeviceMenuStub } from "@/presentationals/stories/stubs/DeviceMenuStub";

const meta = {
  title: "Presentational/Meeting/MeetingControls",
  component: MeetingControls,
  tags: ["autodocs"],
  decorators: [() => ({ template: '<div class="p-8 bg-black"><story /></div>' })],
} satisfies Meta<typeof MeetingControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interactive: Story = {
  render: () => ({
    components: { MeetingControls, DeviceMenuStub },
    setup() {
      const isCameraOn = ref(true);
      const isMicrophoneOn = ref(true);
      const isScreenSharing = ref(false);
      const actionLabel = ref("none");

      function mark(action: string) {
        actionLabel.value = action;
      }

      return {
        isCameraOn,
        isMicrophoneOn,
        isScreenSharing,
        actionLabel,
        mark,
      };
    },
    template: `
      <div class="flex flex-col gap-3 items-start">
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
        <div class="text-xs text-white/80">
          Camera {{ isCameraOn ? 'on' : 'off' }} · Mic {{ isMicrophoneOn ? 'on' : 'off' }} ·
          Share {{ isScreenSharing ? 'on' : 'off' }} · Last: {{ actionLabel }}
        </div>
      </div>
    `,
  }),
};

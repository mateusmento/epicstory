import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import MessageAttachmentTileBody from "../MessageAttachmentTileBody.vue";
import { makeAttachment } from "./message.fixtures";

const meta = {
  title: "Presentational/Messages/MessageAttachmentTileBody",
  component: MessageAttachmentTileBody,
  tags: ["autodocs"],
} satisfies Meta<typeof MessageAttachmentTileBody>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Image: Story = {
  args: { file: makeAttachment({ id: 41, mimeType: "image/png", originalFilename: "board.png" }) },
};

export const Video: Story = {
  args: {
    file: makeAttachment({
      id: 42,
      mimeType: "video/mp4",
      originalFilename: "demo.mp4",
      url: "https://www.w3schools.com/html/mov_bbb.mp4",
    }),
  },
};

export const Document: Story = {
  render: () => ({
    components: { MessageAttachmentTileBody },
    setup() {
      const lastOpen = ref("none");
      return {
        file: makeAttachment({ id: 43, mimeType: "application/pdf", originalFilename: "spec.pdf" }),
        lastOpen,
      };
    },
    template: `
      <div class="max-w-[11rem] p-4">
        <MessageAttachmentTileBody :file="file" @open-preview="lastOpen = 'preview requested'" />
        <p class="mt-2 text-xs text-muted-foreground">{{ lastOpen }}</p>
      </div>
    `,
  }),
};

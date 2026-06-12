import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import AttachmentMediaTile from "../AttachmentMediaTile.vue";
import { makeAttachment, makeFile } from "./message.fixtures";

const meta = {
  title: "Presentational/Messages/AttachmentMediaTile",
  component: AttachmentMediaTile,
  tags: ["autodocs"],
} satisfies Meta<typeof AttachmentMediaTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Uploaded: Story = {
  args: {
    state: { variant: "uploaded", file: makeAttachment({ id: 60, mimeType: "image/png" }) },
  },
};

export const Uploading: Story = {
  args: {
    state: {
      variant: "uploading",
      previewUrl: "https://picsum.photos/220/120",
      mimeType: "image/png",
      originalFilename: "uploading.png",
    },
  },
};

export const Failed: Story = {
  render: () => ({
    components: { AttachmentMediaTile },
    setup() {
      const opened = ref(false);
      return {
        opened,
        state: {
          variant: "failed" as const,
          previewUrl: "https://picsum.photos/220/120",
          mimeType: makeFile("broken.mp4", "video/mp4").type,
          originalFilename: "broken.mp4",
          message: "Network timeout",
        },
      };
    },
    template: `
      <div class="max-w-[11rem] p-4">
        <AttachmentMediaTile :state="state" @open-preview="opened = true" />
        <p class="mt-2 text-xs text-muted-foreground">openPreview emitted: {{ opened ? "yes" : "no" }}</p>
      </div>
    `,
  }),
};

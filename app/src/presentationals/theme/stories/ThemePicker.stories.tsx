import { DropdownMenuPanel } from "@/presentationals/stories/harness/DropdownMenuPanel";
import ThemePicker from "../ThemePicker.vue";
import type { Meta, StoryObj } from "@storybook/vue3";

const meta = {
  title: "Presentational/Theme/ThemePicker",
  component: ThemePicker,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof ThemePicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Segmented: Story = {
  render: () => ({
    components: { ThemePicker },
    template: '<ThemePicker variant="segmented" />',
  }),
  decorators: [
    () => ({
      template: '<div class="w-80 p-4"><story /></div>',
    }),
  ],
};

export const Menu: Story = {
  render: () => ({
    components: { ThemePicker, DropdownMenuPanel },
    template: `
      <DropdownMenuPanel content-class="w-44">
        <ThemePicker variant="menu" />
      </DropdownMenuPanel>
    `,
  }),
  decorators: [
    () => ({
      template: '<div class="w-56 p-4 bg-background"><story /></div>',
    }),
  ],
};

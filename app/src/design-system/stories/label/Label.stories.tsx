import { Input, Label } from "@/design-system";
import type { Meta, StoryObj } from "@storybook/vue3";

const meta = {
  title: "Design System/Label",
  tags: ["autodocs"],
  component: Label,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof Label>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Standalone: Story = {
  render: () => ({
    components: { Label },
    template: '<Label>Account Name</Label>',
  }),
};

export const WithInput: Story = {
  render: () => ({
    components: { Label, Input },
    setup() {
      return { value: "" };
    },
    template: `
      <div class="flex w-full max-w-sm flex-col gap-[0.4rem]">
        <Label for="api-key">API Key</Label>
        <Input id="api-key" v-model="value" placeholder="e.g 1231-23532FG34-A" />
      </div>
    `,
  }),
};

import { Input, Label } from "@/design-system";
import type { Meta, StoryObj } from "@storybook/vue3";

const meta = {
  title: "Design System/Input",
  tags: ["autodocs"],
  component: Input,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { Input },
    setup() {
      return { value: "John Smith" };
    },
    template: '<Input v-model="value" placeholder="e.g John Smith" />',
  }),
};

export const Disabled: Story = {
  render: () => ({
    components: { Input },
    template: '<Input disabled placeholder="Disabled input" model-value="" />',
  }),
};

export const Invalid: Story = {
  render: () => ({
    components: { Input },
    template: '<Input aria-invalid="true" placeholder="Invalid input" model-value="bad@" />',
  }),
};

export const WithLabel: Story = {
  render: () => ({
    components: { Input, Label },
    setup() {
      return { value: "" };
    },
    template: `
      <div class="flex w-full max-w-sm flex-col gap-[0.4rem]">
        <Label for="account-name">Account Name</Label>
        <Input id="account-name" v-model="value" placeholder="e.g John Smith" />
      </div>
    `,
  }),
};

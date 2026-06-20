import { Button } from "@/design-system/ui/button";
import type { Meta, StoryObj } from "@storybook/vue3";

const meta = {
  title: "Design System/Button",
  tags: ["autodocs"],
  component: Button,
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "brand", "outline", "destructive", "secondary", "ghost", "link"],
    },
    size: {
      control: "select",
      options: ["xs", "sm", "normal", "lg", "icon", "icon-sm", "badge"],
    },
    disabled: { control: "boolean" },
  },
  args: {
    variant: "default",
    size: "normal",
    disabled: false,
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => ({
    components: { Button },
    setup: () => ({ args }),
    template: '<Button v-bind="args">Save changes</Button>',
  }),
};

export const Brand: Story = {
  args: { variant: "brand", size: "lg" },
  render: (args) => ({
    components: { Button },
    setup: () => ({ args }),
    template: '<Button v-bind="args">Next</Button>',
  }),
};

export const Outline: Story = {
  args: { variant: "outline", size: "lg" },
  render: (args) => ({
    components: { Button },
    setup: () => ({ args }),
    template: '<Button v-bind="args">Cancel</Button>',
  }),
};

export const Destructive: Story = {
  args: { variant: "destructive" },
  render: (args) => ({
    components: { Button },
    setup: () => ({ args }),
    template: '<Button v-bind="args">Delete issue</Button>',
  }),
};

export const Ghost: Story = {
  args: { variant: "ghost" },
  render: (args) => ({
    components: { Button },
    setup: () => ({ args }),
    template: '<Button v-bind="args">More options</Button>',
  }),
};

export const Sizes: Story = {
  render: () => ({
    components: { Button },
    template: `
      <div class="flex flex-wrap items-center gap-3">
        <Button variant="brand" size="xs">XS</Button>
        <Button variant="brand" size="sm">SM</Button>
        <Button variant="brand" size="normal">Normal</Button>
        <Button variant="brand" size="lg">LG</Button>
      </div>
    `,
  }),
};

export const Disabled: Story = {
  render: () => ({
    components: { Button },
    template: `
      <div class="flex flex-wrap gap-3">
        <Button variant="default" disabled>Default</Button>
        <Button variant="brand" disabled>Brand</Button>
        <Button variant="outline" disabled>Outline</Button>
      </div>
    `,
  }),
};

/** Cancel + Next pair matching ConnectIntegrationDemo */
export const DemoActionPair: Story = {
  render: () => ({
    components: { Button },
    template: `
      <div class="grid w-full max-w-md grid-cols-2 gap-3">
        <Button variant="outline" size="lg">Cancel</Button>
        <Button variant="brand" size="lg">Next</Button>
      </div>
    `,
  }),
};

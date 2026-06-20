import { Button } from "@/design-system/ui/button";
import type { Meta, StoryObj } from "@storybook/vue3";

const variantOptions = [
  "default",
  "primary",
  "outline",
  "destructive",
  "secondary",
  "ghost",
  "link",
] as const;

const meta = {
  title: "Design System/Button",
  tags: ["autodocs"],
  component: Button,
  argTypes: {
    variant: {
      control: "select",
      options: [...variantOptions],
    },
    elevation: {
      control: "select",
      options: ["flat", "elevated"],
    },
    size: {
      control: "select",
      options: ["xs", "sm", "normal", "lg", "icon", "icon-sm", "badge"],
    },
    disabled: { control: "boolean" },
  },
  args: {
    variant: "default",
    elevation: "flat",
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

/** Flat brand fill — composer send, inline actions */
export const PrimaryFlat: Story = {
  args: { variant: "primary", elevation: "flat", size: "sm" },
  render: (args) => ({
    components: { Button },
    setup: () => ({ args }),
    template: '<Button v-bind="args">Send</Button>',
  }),
};

/** Gradient + layered shadow — wizard / onboarding CTAs */
export const PrimaryElevated: Story = {
  args: { variant: "primary", elevation: "elevated", size: "lg" },
  render: (args) => ({
    components: { Button },
    setup: () => ({ args }),
    template: '<Button v-bind="args">Next</Button>',
  }),
};

/** App chrome — transparent border, accent hover */
export const Outline: Story = {
  args: { variant: "outline", elevation: "flat" },
  render: (args) => ({
    components: { Button },
    setup: () => ({ args }),
    template: '<Button v-bind="args">Cancel</Button>',
  }),
};

/** Redesign — demo cancel with white surface + elevation */
export const OutlineElevated: Story = {
  args: { variant: "outline", elevation: "elevated", size: "lg" },
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
        <Button variant="primary" elevation="elevated" size="xs">XS</Button>
        <Button variant="primary" elevation="elevated" size="sm">SM</Button>
        <Button variant="primary" elevation="elevated" size="normal">Normal</Button>
        <Button variant="primary" elevation="elevated" size="lg">LG</Button>
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
        <Button variant="primary" elevation="flat" disabled>Primary flat</Button>
        <Button variant="primary" elevation="elevated" disabled>Primary elevated</Button>
        <Button variant="outline" elevation="flat" disabled>Outline</Button>
        <Button variant="outline" elevation="elevated" disabled>Outline elevated</Button>
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
        <Button variant="outline" elevation="elevated" size="lg">Cancel</Button>
        <Button variant="primary" elevation="elevated" size="lg">Next</Button>
      </div>
    `,
  }),
};

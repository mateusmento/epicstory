import { Badge } from "@/design-system/ui/badge";
import type { Meta, StoryObj } from "@storybook/vue3";

const meta = {
  title: "Design System/Badge",
  tags: ["autodocs"],
  component: Badge,
  argTypes: {
    variant: {
      control: "select",
      options: ["flat", "outline", "soft", "ghost", "text"],
    },
    intent: {
      control: "select",
      options: ["default", "primary", "brand", "secondary", "destructive", "warning"],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { Badge },
    template: "<Badge>Secondary soft</Badge>",
  }),
};

export const FlatDestructive: Story = {
  render: () => ({
    components: { Badge },
    template: '<Badge variant="flat" intent="destructive">3</Badge>',
  }),
};

export const Outline: Story = {
  render: () => ({
    components: { Badge },
    template: '<Badge variant="outline" intent="default">Outline</Badge>',
  }),
};

export const AllIntents: Story = {
  render: () => ({
    components: { Badge },
    template: `
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap gap-2">
          <Badge variant="soft" intent="default">default</Badge>
          <Badge variant="soft" intent="primary">primary</Badge>
          <Badge variant="soft" intent="brand">brand</Badge>
          <Badge variant="soft" intent="secondary">secondary</Badge>
          <Badge variant="soft" intent="destructive">destructive</Badge>
          <Badge variant="soft" intent="warning">warning</Badge>
        </div>
        <div class="flex flex-wrap gap-2">
          <Badge variant="flat" intent="default">default</Badge>
          <Badge variant="flat" intent="primary">primary</Badge>
          <Badge variant="flat" intent="brand">brand</Badge>
          <Badge variant="flat" intent="secondary">secondary</Badge>
          <Badge variant="flat" intent="destructive">destructive</Badge>
          <Badge variant="flat" intent="warning">warning</Badge>
        </div>
        <div class="flex flex-wrap gap-2">
          <Badge variant="outline" intent="default">default</Badge>
          <Badge variant="outline" intent="primary">primary</Badge>
          <Badge variant="outline" intent="secondary">secondary</Badge>
          <Badge variant="outline" intent="destructive">destructive</Badge>
        </div>
      </div>
    `,
  }),
};

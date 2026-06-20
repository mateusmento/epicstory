import { Button } from "@/design-system/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/design-system/ui/tooltip";
import type { Meta, StoryObj } from "@storybook/vue3";

const meta = {
  title: "Design System/Tooltip",
  tags: ["autodocs"],
  component: Tooltip,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Tooltip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Hover: Story = {
  render: () => ({
    components: { Button, Tooltip, TooltipContent, TooltipTrigger },
    template: `
      <Tooltip>
        <TooltipTrigger as-child>
          <Button variant="outline">Hover me</Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Issue key copied to clipboard</p>
        </TooltipContent>
      </Tooltip>
    `,
  }),
};

export const Focus: Story = {
  render: () => ({
    components: { Button, Tooltip, TooltipContent, TooltipTrigger },
    template: `
      <Tooltip>
        <TooltipTrigger as-child>
          <Button variant="ghost">Tab to focus</Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Keyboard-accessible tooltip</p>
        </TooltipContent>
      </Tooltip>
    `,
  }),
};

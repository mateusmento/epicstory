import type { Meta, StoryObj } from "@storybook/vue3";
import Button from "./Button.vue";

const meta = {
  title: "Design System/Button",
  tags: ["autodocs"],
  component: Button,
  args: {
    title: "Hello, world!",
    size: "default",
    variant: "default",
  },
  argTypes: {
    title: {
      control: { type: "text" },
    },
    size: { control: "select", options: ["xs", "sm", "default", "lg", "icon"] },
    variant: {
      control: { type: "radio" },
      options: ["default", "destructive", "outline", "secondary", "ghost", "link"],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

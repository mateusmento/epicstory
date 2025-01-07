import type { Meta, StoryObj } from "@storybook/vue3";
import Button from "./Button.vue";

const meta = {
  title: "Design System/Button",
  tags: ["autodocs"],
  component: Button,
  args: {
    title: "Hello, world!",
    size: "normal",
    variant: "text",
  },
  argTypes: {
    title: { control: { type: "text" } },
    size: { control: "select", options: ["xs", "sm", "normal", "lg", "icon"] },
    variant: {
      control: { type: "select" },
      options: ["primary", "destructive", "outline", "secondary", "text", "link"],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

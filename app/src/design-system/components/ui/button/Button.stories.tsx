import type { Meta, StoryObj } from "@storybook/vue3";
import Button from "./Button.vue";

const meta = {
  title: "Design System/Atoms/Button",
  component: Button,
  render() {
    return <Button variant="outline">Hello world</Button>;
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

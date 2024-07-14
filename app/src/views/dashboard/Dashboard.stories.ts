import type { Meta, StoryObj } from "@storybook/vue3";
import Dashboard from "./Dashboard.vue";

const meta = {
  title: "Application/Views/Dashboard",
  component: Dashboard,
} satisfies Meta<typeof Dashboard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

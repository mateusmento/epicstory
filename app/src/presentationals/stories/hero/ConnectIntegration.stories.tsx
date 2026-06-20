import ConnectIntegrationDemo from "@/views/demo/ConnectIntegrationDemo.vue";
import type { Meta, StoryObj } from "@storybook/vue3";

const meta = {
  title: "Product/Hero/ConnectIntegration",
  component: ConnectIntegrationDemo,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Full redesign reference from ConnectIntegrationDemo. Tier 3 page chrome (radial bg, grid mask, frosted footer) stays local to this composition; Tier 1/2 primitives (Button brand/outline, Input, Label) should match Design System stories. Cross-link: Design System/Tokens/DeferredPatterns.",
      },
    },
  },
} satisfies Meta<typeof ConnectIntegrationDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Happy path — wizard card with form fields and Cancel/Next actions */
export const Default: Story = {};

/**
 * Light-mode reference only today. Tier 3 demo tokens use fixed light palette;
 * toggle Theme toolbar to confirm Tier 1/2 globals do not break layout.
 */
export const LightReference: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Canonical visual spec for auth/wizard redesign. Dark theme may not match demo chrome — re-derive Tier 3 values in task 10 when auth shell adopts this pattern.",
      },
    },
  },
};

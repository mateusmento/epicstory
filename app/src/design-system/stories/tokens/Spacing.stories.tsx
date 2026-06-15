import type { Meta, StoryObj } from "@storybook/vue3";
import { SpacingRuler, SpacingTable, TokenCallout, TokenSection, TokenStoryFrame } from "./TokenDisplay";
import { spacingScale } from "./token-reference";

const meta = {
  title: "Design System/Tokens/Spacing",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function SpacingReference() {
  return (
    <TokenStoryFrame>
      <TokenSection
        title="Custom spacing scale"
        description="Tailwind extend.spacing in tailwind.config.ts — canonical for new work."
      >
        <SpacingRuler tokens={spacingScale} />
      </TokenSection>

      <TokenSection title="Reference table">
        <SpacingTable tokens={spacingScale} />
      </TokenSection>

      <TokenCallout variant="warning">
        <strong>SCSS vs Tailwind:</strong> SCSS mixins like <code>flex:row-md</code> use the same px values but
        a different API (~80+ Vue files). Migration plan: flex:* → Tailwind gap-* over time. See task 09 Legacy
        SCSS audit.
      </TokenCallout>

      <TokenCallout variant="warning">
        <strong>Layout width footgun:</strong> <code>.w-md</code> (460px) and <code>.w-xl</code> (1080px) in{" "}
        <code>sizing.scss</code> are layout widths, not spacing tokens — do not confuse with{" "}
        <code>max-w-md</code> or spacing <code>md</code> (6px).
      </TokenCallout>

      <TokenSection title="Numeric Tailwind vs custom scale">
        <p class="mb-3 text-sm text-muted-foreground">
          Same px, different names: custom <code>p-2xl</code> = 16px vs Tailwind numeric <code>p-4</code> = 16px.
          Prefer semantic custom names for redesign work; be explicit when mixing APIs.
        </p>
        <div class="flex items-end gap-4">
          <div class="text-center">
            <div class="mb-1 h-4 bg-primary/80" style={{ width: "1rem" }} />
            <code class="text-xs">p-2xl (16px)</code>
          </div>
          <div class="text-center">
            <div class="mb-1 h-4 w-4 bg-primary/80" />
            <code class="text-xs">p-4 (16px)</code>
          </div>
        </div>
      </TokenSection>
    </TokenStoryFrame>
  );
}

export const Reference: Story = {
  render: () => () => <SpacingReference />,
};

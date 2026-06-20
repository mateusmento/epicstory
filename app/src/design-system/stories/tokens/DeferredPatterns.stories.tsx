import type { Meta, StoryObj } from "@storybook/vue3";
import { TokenCallout, TokenSection, TokenStoryFrame } from "./TokenDisplay";
import { deferredPatterns } from "./token-reference";

const meta = {
  title: "Design System/Tokens/DeferredPatterns",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function DeferredPatternsReference() {
  return (
    <TokenStoryFrame>
      <TokenSection
        title="Tier 3 — surface-specific patterns"
        description="Visual reference from ConnectIntegrationDemo. Not global :root tokens. Promote to Tier 1/2 after 3+ surfaces reuse."
      >
        <TokenCallout>
          Source:{" "}
          <code>app/src/views/demo/ConnectIntegrationDemo.vue</code>. Regression target:{" "}
          <code>Product/Hero/ConnectIntegration</code> (Phase 4 — see hero README checklist).
        </TokenCallout>
      </TokenSection>

      <div class="space-y-8">
        {deferredPatterns.map((pattern) => (
          <TokenSection key={pattern.id} title={pattern.title} description={pattern.description}>
            <div class="grid gap-4 md:grid-cols-2">
              <div
                class={pattern.previewClass ?? "h-32 rounded-lg border border-border"}
                style={pattern.previewStyle}
              />
              <div class="space-y-2 text-sm">
                <p>
                  <span class="font-medium text-foreground">Demo source:</span>{" "}
                  <code class="text-xs">{pattern.demoSource}</code>
                </p>
                <p>
                  <span class="font-medium text-foreground">Promote when:</span>{" "}
                  <span class="text-muted-foreground">{pattern.promoteWhen}</span>
                </p>
              </div>
            </div>
          </TokenSection>
        ))}
      </div>

      <TokenCallout variant="warning">
        Grid overlay uses <code>mask-image</code> — Tailwind cannot express this; keep in layout CSS. Page chrome
        uses 4-layer radial backgrounds — defer to auth/wizard shell (task 10).
      </TokenCallout>
    </TokenStoryFrame>
  );
}

export const Reference: Story = {
  render: () => () => <DeferredPatternsReference />,
};

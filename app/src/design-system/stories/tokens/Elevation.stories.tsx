import type { Meta, StoryObj } from "@storybook/vue3";
import { ShadowCard, TokenCallout, TokenSection, TokenStoryFrame } from "./TokenDisplay";
import { elevationTokens } from "./token-reference";

const meta = {
  title: "Design System/Tokens/Elevation",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function ElevationReference() {
  const cardShadow = elevationTokens.find((t) => t.name === "card-elevated");
  const btnShadows = elevationTokens.filter((t) => t.name.startsWith("btn-"));

  return (
    <TokenStoryFrame>
      <TokenSection
        title="Tier 2 elevation tokens"
        description="Multi-layer shadows from ConnectIntegrationDemo. Planned as named utilities in tailwind.config.ts (Phase 3)."
      >
        <TokenCallout>
          Multi-layer inset shadows require <code>theme.extend.boxShadow</code> in tailwind.config.ts — not
          arbitrary Tailwind utilities.
        </TokenCallout>
      </TokenSection>

      <TokenSection title="Card elevation">
        {cardShadow ? (
          <div class="max-w-xs">
            <ShadowCard
              name={cardShadow.name}
              shadow={cardShadow.shadow}
              tailwindUtility={cardShadow.tailwindUtility}
              demoKey={cardShadow.demoKey}
              status={cardShadow.status}
              usedOn={cardShadow.usedOn}
            />
          </div>
        ) : null}
      </TokenSection>

      <TokenSection title="Button shadows (brand + outline)">
        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {btnShadows.map((token) => (
            <ShadowCard
              key={token.name}
              name={token.name}
              shadow={token.shadow}
              tailwindUtility={token.tailwindUtility}
              demoKey={token.demoKey}
              status={token.status}
              usedOn={token.usedOn}
            />
          ))}
        </div>
      </TokenSection>

      <TokenSection title="Demo → utility mapping">
        <div class="overflow-x-auto rounded-lg border border-border">
          <table class="w-full min-w-[36rem] text-left text-sm">
            <thead class="border-b border-border bg-muted/50">
              <tr>
                <th class="px-4 py-2 font-medium text-foreground">Demo key</th>
                <th class="px-4 py-2 font-medium text-foreground">Proposed utility</th>
                <th class="px-4 py-2 font-medium text-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {elevationTokens.map((token) => (
                <tr key={token.name} class="border-b border-border last:border-0">
                  <td class="px-4 py-2 font-mono text-xs">{token.demoKey}</td>
                  <td class="px-4 py-2 font-mono text-xs">{token.tailwindUtility}</td>
                  <td class="px-4 py-2 text-xs uppercase text-muted-foreground">{token.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TokenSection>

      <TokenSection title="Stacked comparison">
        <div class="flex flex-wrap items-end gap-6">
          {elevationTokens.slice(0, 3).map((token) => (
            <div
              key={token.name}
              class="flex h-16 w-32 items-center justify-center rounded-lg border border-border bg-card text-xs text-muted-foreground"
              style={{ boxShadow: token.shadow }}
            >
              {token.name}
            </div>
          ))}
        </div>
      </TokenSection>
    </TokenStoryFrame>
  );
}

export const Reference: Story = {
  render: () => () => <ElevationReference />,
};

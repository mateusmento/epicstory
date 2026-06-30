import type { Meta, StoryObj } from "@storybook/vue3";
import {
  ColorSwatch,
  ColorSwatchGrid,
  DemoMappingTable,
  DarkThemeIsland,
  LightThemeIsland,
  TokenCallout,
  TokenSection,
  TokenStoryFrame,
} from "./TokenDisplay";
import { demoColorMappings, domainColors, plannedBrandColors, semanticColors } from "./token-reference";

const meta = {
  title: "Design System/Tokens/Colors",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const coreSemantic = semanticColors.filter((t) =>
  [
    "background",
    "foreground",
    "primary",
    "secondary",
    "muted",
    "accent",
    "destructive",
    "border",
    "card",
    "popover",
    "ring",
  ].some((key) => t.name === key || t.name.startsWith(`${key}-`)),
);

function ColorsReference() {
  return (
    <TokenStoryFrame>
      <TokenSection
        title="Semantic colors"
        description="Canonical OKLCH tokens from main.css. Swatches follow the Storybook Theme toolbar (light / dark)."
      >
        <ColorSwatchGrid tokens={coreSemantic} />
      </TokenSection>

      <TokenSection
        title="Light / dark comparison"
        description="Fixed palettes — independent of the toolbar — for reviewing both modes side by side."
      >
        <div class="grid gap-4 md:grid-cols-2">
          <LightThemeIsland>
            <div class="grid gap-2">
              {["background", "foreground", "muted", "border", "primary"].map((name) => {
                const token = semanticColors.find((t) => t.name === name);
                if (!token) return null;
                return (
                  <div key={name} class="flex items-center gap-2">
                    <div
                      class="size-8 rounded border border-border"
                      style={{ background: `oklch(var(${token.cssVar}))` }}
                    />
                    <code class="text-xs">{token.cssVar}</code>
                  </div>
                );
              })}
            </div>
          </LightThemeIsland>
          <DarkThemeIsland>
            <div class="grid gap-2">
              {["background", "foreground", "muted", "border", "primary"].map((name) => {
                const token = semanticColors.find((t) => t.name === name);
                if (!token) return null;
                return (
                  <div key={name} class="flex items-center gap-2">
                    <div
                      class="size-8 rounded border border-border"
                      style={{ background: `oklch(var(${token.cssVar}))` }}
                    />
                    <code class="text-xs">{token.cssVar}</code>
                  </div>
                );
              })}
            </div>
          </DarkThemeIsland>
        </div>
      </TokenSection>

      <TokenSection
        title="Domain tokens"
        description="Product-specific tokens from main.css + component-colors.ts."
      >
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {domainColors.map((token) => (
            <div key={token.name} class="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
              <div
                class="size-12 shrink-0 rounded-md border border-border"
                style={{ background: `oklch(var(${token.cssVar}))` }}
              />
              <div class="min-w-0 space-y-0.5">
                <code class="text-sm font-medium text-foreground">{token.name}</code>
                <code class="block text-xs text-muted-foreground">{token.cssVar}</code>
                <code class="block text-xs text-muted-foreground">{token.tailwindClass}</code>
                {token.demoRole ? <p class="text-xs text-muted-foreground">{token.demoRole}</p> : null}
              </div>
            </div>
          ))}
        </div>
      </TokenSection>

      <TokenSection
        title="Brand tokens"
        description="From ConnectIntegrationDemo — canonical in main.css (light + dark). White text on brand gradient requires sufficient contrast (WCAG AA target)."
      >
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plannedBrandColors.map((token) => (
            <ColorSwatch
              key={token.name}
              name={token.name}
              cssVar={token.cssVar}
              tailwindClass={token.tailwindBg}
              demoHex={token.demoHex}
              demoRole={token.demoRole}
              status={token.status}
            />
          ))}
        </div>
        <TokenCallout variant="warning">
          Brand CTA uses white text on a blue gradient (#5d5cff → #4a49e0). Verify contrast before locking
          merged token values.
        </TokenCallout>
      </TokenSection>

      <TokenSection
        title="Demo → token mapping (Tier 1)"
        description="ConnectIntegrationDemo hex values mapped to canonical semantic tokens."
      >
        <DemoMappingTable rows={demoColorMappings} />
      </TokenSection>
    </TokenStoryFrame>
  );
}

export const Reference: Story = {
  render: () => () => <ColorsReference />,
};

import type { Meta, StoryObj } from "@storybook/vue3";
import { RadiusPreview, TokenSection, TokenStoryFrame } from "./TokenDisplay";
import { radiusTokens } from "./token-reference";

const meta = {
  title: "Design System/Tokens/Radius",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function RadiusReference() {
  const cssVarRadius = radiusTokens.filter((t) => t.source === "css-var" || t.source === "demo");
  const tailwindRadius = radiusTokens.filter((t) => t.source === "tailwind");

  return (
    <TokenStoryFrame>
      <TokenSection
        title="Base radius"
        description="--radius in main.css (0.5rem). Demo card uses 1.35rem — proposed as --radius-card / borderRadius.card-lg."
      >
        <div class="flex flex-wrap gap-8">
          {cssVarRadius.map((token) => (
            <RadiusPreview
              key={token.name}
              name={token.name}
              value={token.value}
              note={token.note}
              className={token.tailwindClass}
              style={
                token.source === "css-var" && token.name.includes("default")
                  ? { borderRadius: "var(--radius)" }
                  : token.source === "demo"
                    ? { borderRadius: token.value }
                    : undefined
              }
            />
          ))}
        </div>
      </TokenSection>

      <TokenSection title="Tailwind borderRadius extend scale">
        <div class="flex flex-wrap gap-8">
          {tailwindRadius.map((token) => (
            <RadiusPreview
              key={token.name}
              name={token.name}
              value={token.value}
              className={token.tailwindClass}
            />
          ))}
        </div>
      </TokenSection>

      <TokenSection title="Reference table">
        <div class="overflow-x-auto rounded-lg border border-border">
          <table class="w-full min-w-[28rem] text-left text-sm">
            <thead class="border-b border-border bg-muted/50">
              <tr>
                <th class="px-4 py-2 font-medium text-foreground">Name</th>
                <th class="px-4 py-2 font-medium text-foreground">Value</th>
                <th class="px-4 py-2 font-medium text-foreground">Source</th>
                <th class="px-4 py-2 font-medium text-foreground">Tailwind</th>
              </tr>
            </thead>
            <tbody>
              {radiusTokens.map((token) => (
                <tr key={token.name} class="border-b border-border last:border-0">
                  <td class="px-4 py-2 font-mono text-xs">{token.name}</td>
                  <td class="px-4 py-2 font-mono text-xs">{token.value}</td>
                  <td class="px-4 py-2 text-muted-foreground">{token.source}</td>
                  <td class="px-4 py-2 font-mono text-xs">{token.tailwindClass ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TokenSection>
    </TokenStoryFrame>
  );
}

export const Reference: Story = {
  render: () => () => <RadiusReference />,
};

import type { Meta, StoryObj } from "@storybook/vue3";
import { TokenSection, TokenStoryFrame, TokenCallout } from "./TokenDisplay";
import { fontFamilies, typographySamples } from "./token-reference";

const meta = {
  title: "Design System/Tokens/Typography",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function TypographyReference() {
  return (
    <TokenStoryFrame>
      <TokenSection
        title="Font families"
        description="body font is set in main.css; Tailwind fontFamily.* provides utility classes. Canonical UI font TBD."
      >
        <TokenCallout>
          Open question: resolve Inter (body) vs Tailwind lato / dmSans / inter / jakartaSans — see task 09
          decision log.
        </TokenCallout>
        <div class="overflow-x-auto rounded-lg border border-border">
          <table class="w-full min-w-[28rem] text-left text-sm">
            <thead class="border-b border-border bg-muted/50">
              <tr>
                <th class="px-4 py-2 font-medium text-foreground">Name</th>
                <th class="px-4 py-2 font-medium text-foreground">Value</th>
                <th class="px-4 py-2 font-medium text-foreground">Source</th>
              </tr>
            </thead>
            <tbody>
              {fontFamilies.map((font) => (
                <tr key={font.name} class="border-b border-border last:border-0">
                  <td class="px-4 py-2 font-mono text-xs">{font.name}</td>
                  <td class="px-4 py-2 text-muted-foreground">{font.value}</td>
                  <td class="px-4 py-2 text-xs text-muted-foreground">{font.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TokenSection>

      <TokenSection
        title="Type scale & weights"
        description="Default Tailwind scale plus demo form density (13px labels, text-lg titles)."
      >
        <div class="space-y-6">
          {typographySamples.map((sample) => (
            <div key={sample.label} class="border-b border-border pb-4 last:border-0">
              <p class={sample.className}>{sample.sample}</p>
              <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <code>{sample.label}</code>
                <span>Source: {sample.source}</span>
                {sample.note ? <span>{sample.note}</span> : null}
              </div>
            </div>
          ))}
        </div>
      </TokenSection>

      <TokenSection title="Font family previews">
        <div class="space-y-4">
          {fontFamilies
            .filter((f) => f.source === "tailwind.config")
            .map((font) => (
              <div key={font.name}>
                <p class="text-base" style={{ fontFamily: font.value }}>
                  The quick brown fox jumps over the lazy dog — {font.name}
                </p>
                <code class="text-xs text-muted-foreground">font-family: {font.value}</code>
              </div>
            ))}
        </div>
      </TokenSection>
    </TokenStoryFrame>
  );
}

export const Reference: Story = {
  render: () => () => <TypographyReference />,
};

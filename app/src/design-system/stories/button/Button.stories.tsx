import { Button } from "@/design-system/ui/button";
import type { Meta, StoryObj } from "@storybook/vue3";
import { buttonColors, buttonSurfaceVariants } from "@/design-system/ui/button/button-variant-classes";
import { TokenSection, TokenStoryFrame } from "@/design-system/stories/tokens/TokenDisplay";

const indigoTokenSwatches = [
  { label: "--brand / indigo-500", css: "oklch(var(--brand))", hex: "#6366f1" },
  { label: "--brand-via / indigo-600", css: "oklch(var(--brand-via))", hex: "#4f46e5" },
  { label: "--brand-to / indigo-700", css: "oklch(var(--brand-to))", hex: "#4338ca" },
  { label: "--brand-border", css: "oklch(var(--brand-border))", hex: "#4338ca" },
  { label: "outline border / indigo-200", css: "oklch(var(--indigo-200))", hex: "#c7d2fe" },
  { label: "soft bg / indigo-50", css: "oklch(var(--indigo-50))", hex: "#eef2ff" },
] as const;

function IndigoTokenReference() {
  return (
    <TokenStoryFrame>
      <TokenSection
        title="Primary indigo tokens"
        description="Brand and primary buttons map to Tailwind indigo stops. Flat and brand variants share indigo-500/600/700 for fills; borders and soft surfaces use lighter indigo steps."
      >
        <div class="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {indigoTokenSwatches.map((swatch) => (
            <div
              key={swatch.label}
              class="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <div
                class="size-10 shrink-0 rounded-md border border-black/5"
                style={{ background: swatch.css }}
              />
              <div class="min-w-0">
                <p class="text-xs font-medium text-foreground">{swatch.label}</p>
                <p class="font-mono text-[0.625rem] text-muted-foreground">{swatch.hex}</p>
              </div>
            </div>
          ))}
        </div>

        <div class="space-y-3">
          <h3 class="text-sm font-semibold text-foreground">Button variants</h3>
          <div class="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/20 p-6">
            <Button variant="brand" color="primary" size="lg">
              Brand primary
            </Button>
            <Button variant="flat" color="primary" size="lg">
              Flat primary
            </Button>
            <Button variant="outline" color="primary" size="lg">
              Outline primary
            </Button>
            <Button variant="soft" color="primary" size="lg">
              Soft primary
            </Button>
          </div>
        </div>

        <div class="mt-8 space-y-3">
          <h3 class="text-sm font-semibold text-foreground">ConnectIntegrationDemo pair</h3>
          <div class="grid max-w-md grid-cols-2 gap-3">
            <Button variant="surface" color="secondary" size="lg">
              Cancel
            </Button>
            <Button variant="brand" color="primary" size="lg">
              Next
            </Button>
          </div>
        </div>
      </TokenSection>
    </TokenStoryFrame>
  );
}

const meta = {
  title: "Design System/Button",
  tags: ["autodocs"],
  component: Button,
  argTypes: {
    variant: {
      control: "select",
      options: [...buttonSurfaceVariants],
    },
    color: {
      control: "select",
      options: [...buttonColors],
    },
    size: {
      control: "select",
      options: ["xs", "sm", "normal", "lg", "icon", "icon-sm", "badge"],
    },
    disabled: { control: "boolean" },
  },
  args: {
    variant: "flat",
    color: "default",
    size: "normal",
    disabled: false,
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FlatDefault: Story = {
  args: { variant: "flat", color: "default" },
  render: (args) => ({
    components: { Button },
    setup: () => ({ args }),
    template: '<Button v-bind="args">Save changes</Button>',
  }),
};

export const FlatPrimary: Story = {
  args: { variant: "flat", color: "primary", size: "sm" },
  render: (args) => ({
    components: { Button },
    setup: () => ({ args }),
    template: '<Button v-bind="args">Send</Button>',
  }),
};

export const BrandPrimary: Story = {
  args: { variant: "brand", color: "primary", size: "lg" },
  render: (args) => ({
    components: { Button },
    setup: () => ({ args }),
    template: '<Button v-bind="args">Next</Button>',
  }),
};

export const OutlineDefault: Story = {
  args: { variant: "outline", color: "default" },
  render: (args) => ({
    components: { Button },
    setup: () => ({ args }),
    template: '<Button v-bind="args">Cancel</Button>',
  }),
};

export const SurfaceSecondary: Story = {
  args: { variant: "surface", color: "secondary", size: "lg" },
  render: (args) => ({
    components: { Button },
    setup: () => ({ args }),
    template: '<Button v-bind="args">Cancel</Button>',
  }),
};

export const SoftDestructive: Story = {
  args: { variant: "soft", color: "destructive" },
  render: (args) => ({
    components: { Button },
    setup: () => ({ args }),
    template: '<Button v-bind="args">Remove label</Button>',
  }),
};

export const GhostDefault: Story = {
  args: { variant: "ghost", color: "default" },
  render: (args) => ({
    components: { Button },
    setup: () => ({ args }),
    template: '<Button v-bind="args">More options</Button>',
  }),
};

export const TextPrimary: Story = {
  args: { variant: "text", color: "primary" },
  render: (args) => ({
    components: { Button },
    setup: () => ({ args }),
    template: '<Button v-bind="args">Learn more</Button>',
  }),
};

export const BrandDestructive: Story = {
  args: { variant: "brand", color: "destructive", size: "lg" },
  render: (args) => ({
    components: { Button },
    setup: () => ({ args }),
    template: '<Button v-bind="args">Delete permanently</Button>',
  }),
};

export const GhostGray: Story = {
  args: { variant: "ghost", color: "gray" },
  render: (args) => ({
    components: { Button },
    setup: () => ({ args }),
    template: '<Button v-bind="args">Nav item</Button>',
  }),
};

export const FlatWarning: Story = {
  args: { variant: "flat", color: "warning" },
  render: (args) => ({
    components: { Button },
    setup: () => ({ args }),
    template: '<Button v-bind="args">Proceed with caution</Button>',
  }),
};

export const IntentOverview: Story = {
  render: () => ({
    components: { Button },
    template: `
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap gap-2">
          <Button variant="flat" color="default">flat default</Button>
          <Button variant="flat" color="primary">flat primary</Button>
          <Button variant="flat" color="secondary">flat secondary</Button>
          <Button variant="flat" color="destructive">flat destructive</Button>
          <Button variant="flat" color="warning">flat warning</Button>
          <Button variant="flat" color="gray">flat gray</Button>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" color="default">outline</Button>
          <Button variant="outline" color="gray">outline gray</Button>
          <Button variant="surface" color="secondary">surface</Button>
          <Button variant="soft" color="destructive">soft</Button>
          <Button variant="ghost" color="gray">ghost gray</Button>
          <Button variant="text" color="primary">text</Button>
          <Button variant="brand" color="primary">brand</Button>
        </div>
      </div>
    `,
  }),
};

function ButtonVariantColorGrid() {
  return (
    <div class="w-full max-w-5xl rounded-lg border border-slate-200 bg-white p-6 text-foreground">
      <TokenSection
        title="Variant × color"
        description="Full matrix of surface variants and intent colors. Rows are variants; columns are colors."
      >
        <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table class="w-full min-w-[48rem] border-collapse text-sm">
            <thead>
              <tr class="border-b border-slate-200 bg-zinc-50">
                <th class="sticky left-0 z-10 bg-zinc-50 p-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Variant
                </th>
                {buttonColors.map((color) => (
                  <th
                    key={color}
                    class="bg-zinc-50 p-3 text-center text-xs font-medium capitalize tracking-wide text-muted-foreground"
                  >
                    {color}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {buttonSurfaceVariants.map((variant) => (
                <tr key={variant} class="border-b border-slate-200 bg-white last:border-b-0">
                  <th
                    scope="row"
                    class="sticky left-0 z-10 bg-white p-3 text-left font-mono text-xs font-normal text-muted-foreground"
                  >
                    {variant}
                  </th>
                  {buttonColors.map((color) => (
                    <td key={color} class="bg-white p-3 text-center">
                      <Button variant={variant} color={color} size="lg" class="min-w-[5.5rem] capitalize">
                        {color}
                      </Button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TokenSection>
    </div>
  );
}

/** Every variant × color combination in one scrollable grid */
export const VariantColorGrid: Story = {
  parameters: {
    backgrounds: { default: "white" },
  },
  render: () => () => <ButtonVariantColorGrid />,
};

export const Sizes: Story = {
  render: () => ({
    components: { Button },
    template: `
      <div class="flex flex-wrap items-center gap-3">
        <Button variant="brand" color="primary" size="xs">XS</Button>
        <Button variant="brand" color="primary" size="sm">SM</Button>
        <Button variant="brand" color="primary" size="normal">Normal</Button>
        <Button variant="brand" color="primary" size="lg">LG</Button>
      </div>
    `,
  }),
};

export const Disabled: Story = {
  render: () => ({
    components: { Button },
    template: `
      <div class="flex flex-wrap gap-3">
        <Button variant="flat" color="default" disabled>Default</Button>
        <Button variant="flat" color="primary" disabled>Primary</Button>
        <Button variant="brand" color="primary" disabled>Brand</Button>
        <Button variant="outline" color="default" disabled>Outline</Button>
        <Button variant="surface" color="secondary" disabled>Surface</Button>
        <Button variant="flat" color="destructive" disabled>Destructive</Button>
        <Button variant="brand" color="destructive" disabled>Brand destructive</Button>
      </div>
    `,
  }),
};

/** Cancel + Next pair matching ConnectIntegrationDemo */
export const DemoActionPair: Story = {
  render: () => ({
    components: { Button },
    template: `
      <div class="grid w-full max-w-md grid-cols-2 gap-3">
        <Button variant="surface" color="secondary" size="lg">Cancel</Button>
        <Button variant="brand" color="primary" size="lg">Next</Button>
      </div>
    `,
  }),
};

/** Primary indigo token mapping (Tailwind indigo-500/600/700) */
export const IndigoTokens: Story = {
  render: () => () => <IndigoTokenReference />,
};

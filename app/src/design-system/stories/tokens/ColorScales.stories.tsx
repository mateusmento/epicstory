import type { Meta, StoryObj } from "@storybook/vue3";
import { TokenCallout, TokenSection, TokenStoryFrame } from "./TokenDisplay";
import {
  colorPalettes,
  colorScaleSteps,
  listItemFormula,
  scaleFormula,
  slateBorderScale,
  slateBorderScaleMeta,
  type ColorPalette,
  type FixedScaleStep,
} from "./color-scales";

const meta = {
  title: "Design System/Tokens/Color Scales",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function contrastText(step: number) {
  return step <= 0 ? "text-white" : "text-foreground";
}

function fixedScaleContrast(label: string) {
  const darkLabels = ["950", "900", "800", "700", "600"];
  return darkLabels.includes(label) ? "text-white" : "text-foreground";
}

function FixedScaleRow(props: {
  title: string;
  description: string;
  steps: FixedScaleStep[];
  meta?: { lStep: string; anchorLabel: string; anchorNote: string; tokenRef?: string };
}) {
  return (
    <div class="space-y-2">
      <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 class="text-sm font-semibold text-foreground">{props.title}</h3>
        {props.meta?.tokenRef ? (
          <code class="text-xs text-muted-foreground">→ {props.meta.tokenRef}</code>
        ) : null}
      </div>
      <p class="text-xs text-muted-foreground">{props.description}</p>
      {props.meta ? (
        <p class="text-xs text-muted-foreground">
          Even <code>{props.meta.lStep}</code> lightness steps · anchor {props.meta.anchorLabel} is{" "}
          {props.meta.anchorNote}
        </p>
      ) : null}
      <div class="grid grid-cols-11 gap-1">
        {props.steps.map((stop) => (
          <div key={stop.label} class="space-y-1">
            <div
              class={[
                "relative h-14 rounded-md border",
                stop.demoHex ? "ring-2 ring-brand ring-offset-1" : "border-black/5",
                fixedScaleContrast(stop.label),
              ].join(" ")}
              style={{ backgroundColor: stop.oklch }}
              title={stop.demoHex ?? stop.oklch}
            >
              <span class="flex h-full items-end justify-center pb-1 text-[0.625rem] font-medium">{stop.label}</span>
              {stop.demoHex ? (
                <span class="absolute right-0.5 top-0.5 rounded bg-brand px-1 py-px text-[0.5rem] font-semibold uppercase tracking-wide text-white">
                  demo
                </span>
              ) : null}
            </div>
            {stop.demoHex ? (
              <p class="text-center text-[0.625rem] text-muted-foreground">
                <span class="font-mono">{stop.demoHex}</span>
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function PaletteScaleRow(props: { palette: ColorPalette }) {
  return (
    <div class="space-y-2">
      <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 class="text-sm font-semibold capitalize text-foreground">{props.palette.name}</h3>
        <code class="text-xs text-muted-foreground">{props.palette.cssVar}</code>
        {props.palette.tokenRef ? (
          <span class="text-xs text-muted-foreground">→ {props.palette.tokenRef}</span>
        ) : null}
      </div>
      <p class="text-xs text-muted-foreground">{props.palette.description}</p>
      <div class="grid grid-cols-11 gap-1">
        {colorScaleSteps.map(({ label, step }) => (
          <div key={label} class="space-y-1">
            <div
              class={["color-scale-shade h-14 rounded-md border border-black/5", contrastText(step)].join(" ")}
              style={{
                "--scale-base": `var(${props.palette.cssVar})`,
                "--step": String(step),
              }}
            >
              <span class="flex h-full items-end justify-center pb-1 text-[0.625rem] font-medium">{label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreboardDemo(props: { palette: ColorPalette }) {
  const players = [
    { rank: 1, name: "Cyberduck", score: 404 },
    { rank: 2, name: "Ladylucifer", score: 388 },
    { rank: 3, name: "RetroPirate", score: 303 },
    { rank: 4, name: "KRmonster", score: 260 },
    { rank: 5, name: "Superfox", score: 222 },
  ];

  return (
    <div
      class="color-scale-highlight mx-auto w-full max-w-md rounded-xl p-8"
      style={{ "--scale-base": `var(${props.palette.cssVar})` }}
    >
      <div class="overflow-hidden rounded-[10px] shadow-2xl">
        <header
          class="color-scale-header flex items-center gap-4 px-6 py-4"
          style={{ "--scale-base": `var(${props.palette.cssVar})` }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="size-6"
            style={{ color: `var(${props.palette.cssVar})` }}
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"
            />
          </svg>
          <h2 class="text-base font-semibold">Top 5 Players</h2>
        </header>
        <ol class="list-none p-0">
          {players.map((player) => (
            <li
              key={player.rank}
              class="color-scale-list-item flex items-center gap-4 px-6 py-4 text-white"
              style={{
                "--scale-base": `var(${props.palette.cssVar})`,
                "--i": String(player.rank),
              }}
            >
              <span
                class="inline-flex aspect-square size-[3ch] items-center justify-center rounded-full bg-white text-[0.9rem] leading-none"
                style={{ color: "var(--_bg)" }}
              >
                {player.rank}
              </span>
              <p class="min-w-0 flex-1 truncate">{player.name}</p>
              <span class="tabular-nums">{player.score}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function ColorScalesReference() {
  return (
    <TokenStoryFrame>
      <TokenSection
        title="OKLCH shade scales"
        description="Each palette anchor (--scale-*) generates 11 perceptual steps (950 → 50) using relative OKLCH color functions. Step 500 matches the anchor mid-tone."
      >
        <TokenCallout>
          Tokens in main.css now store OKLCH components (<code>L% C H</code>) consumed as{" "}
          <code>oklch(var(--token))</code>. Palette anchors use full <code>oklch()</code> values for{" "}
          <code>oklch(from var(--scale-base) …)</code> relative syntax.
        </TokenCallout>
        <div class="space-y-8">
          {colorPalettes.map((palette) => (
            <PaletteScaleRow key={palette.name} palette={palette} />
          ))}
        </div>
      </TokenSection>

      <TokenSection
        title="Slate border scale (fixed)"
        description="Even OKLCH ramp for ConnectIntegrationDemo border gray. #E2E8F0 is a light tint — placed at 200, not at the 500 anchor."
      >
        <FixedScaleRow
          title={slateBorderScaleMeta.name}
          description={slateBorderScaleMeta.description}
          steps={slateBorderScale}
          meta={slateBorderScaleMeta}
        />
      </TokenSection>

      <TokenSection
        title="Relative color formulas"
        description="Shades derive from each anchor — lightness steps up/down, chroma tapers at extremes, hue drifts slightly."
      >
        <div class="space-y-4 rounded-lg border border-border bg-muted/30 p-4 font-mono text-xs leading-relaxed text-muted-foreground">
          <div>
            <p class="mb-1 font-sans text-sm font-medium text-foreground">Scale swatch (--step: -5 … +5)</p>
            <pre class="whitespace-pre-wrap">{scaleFormula}</pre>
          </div>
          <div>
            <p class="mb-1 font-sans text-sm font-medium text-foreground">List item darkening (--i: 1 … 5)</p>
            <pre class="whitespace-pre-wrap">{listItemFormula}</pre>
          </div>
          <div>
            <p class="mb-1 font-sans text-sm font-medium text-foreground">CSS variables</p>
            <pre>{`--scale-l-step: 0.07;
--scale-c-step: 0.015;
--scale-h-step: 0.5;`}</pre>
          </div>
        </div>
      </TokenSection>

      <TokenSection
        title="Scoreboard demo (brand palette)"
        description="Same pattern as the CSS relative-color showcase — radial highlight, dark header, progressively darker list rows."
      >
        <ScoreboardDemo palette={colorPalettes.find((p) => p.name === "brand")!} />
      </TokenSection>

      <TokenSection title="All palettes — scoreboard pattern" description="Each base color with the list-item shade function.">
        <div class="grid gap-8 lg:grid-cols-2">
          {colorPalettes.map((palette) => (
            <div key={palette.name} class="space-y-2">
              <h3 class="text-sm font-semibold capitalize text-foreground">{palette.name}</h3>
              <ScoreboardDemo palette={palette} />
            </div>
          ))}
        </div>
      </TokenSection>
    </TokenStoryFrame>
  );
}

export const Scales: Story = {
  render: () => () => <ColorScalesReference />,
};

export const BrandScoreboard: Story = {
  render: () => () => (
    <div class="not-prose flex min-h-[32rem] items-center justify-center p-8">
      <ScoreboardDemo palette={colorPalettes.find((p) => p.name === "brand")!} />
    </div>
  ),
};

export const SlateBorderScale: Story = {
  render: () => () => (
    <TokenStoryFrame>
      <FixedScaleRow
        title={slateBorderScaleMeta.name}
        description={slateBorderScaleMeta.description}
        steps={slateBorderScale}
        meta={slateBorderScaleMeta}
      />
    </TokenStoryFrame>
  ),
};

export const SinglePalette: Story = {
  argTypes: {
    palette: {
      control: "select",
      options: colorPalettes.map((p) => p.name),
    },
  },
  args: {
    palette: "brand",
  },
  render: (args) => () => {
    const palette = colorPalettes.find((p) => p.name === args.palette) ?? colorPalettes[0];
    return (
      <TokenStoryFrame>
        <PaletteScaleRow palette={palette} />
      </TokenStoryFrame>
    );
  },
};

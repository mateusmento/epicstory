import { cn } from "@/design-system/utils";
import { defineComponent, type CSSProperties, type PropType } from "vue";
import type { SemanticColorToken, SpacingToken } from "./token-reference";

export const TokenSection = defineComponent({
  name: "TokenSection",
  props: {
    title: { type: String, required: true },
    description: { type: String, default: "" },
  },
  setup(props, { slots }) {
    return () => (
      <section class="mb-10">
        <h2 class="mb-1 text-base font-semibold text-foreground">{props.title}</h2>
        {props.description ? <p class="mb-4 text-sm text-muted-foreground">{props.description}</p> : null}
        {slots.default?.()}
      </section>
    );
  },
});

export const TokenCallout = defineComponent({
  name: "TokenCallout",
  props: {
    variant: { type: String as PropType<"info" | "warning">, default: "info" },
  },
  setup(props, { slots }) {
    return () => (
      <div
        class={cn(
          "mb-4 rounded-lg border px-4 py-3 text-sm",
          props.variant === "warning"
            ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
            : "border-border bg-muted/50 text-muted-foreground",
        )}
      >
        {slots.default?.()}
      </div>
    );
  },
});

export const ColorSwatch = defineComponent({
  name: "ColorSwatch",
  props: {
    name: { type: String, required: true },
    cssVar: { type: String, required: true },
    tailwindClass: { type: String, default: "" },
    demoHex: { type: String, default: "" },
    demoRole: { type: String, default: "" },
    status: { type: String as PropType<"canonical" | "planned">, default: "canonical" },
    showForegroundSample: { type: Boolean, default: false },
  },
  setup(props) {
    const isForegroundToken = props.name.includes("foreground");

    return () => (
      <div class="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
        <div
          class={cn(
            "size-12 shrink-0 rounded-md border border-border",
            isForegroundToken && "ring-1 ring-inset ring-border",
          )}
          style={{
            background: isForegroundToken
              ? `hsl(var(--background))`
              : `hsl(var(${props.cssVar}))`,
            color: isForegroundToken ? `hsl(var(${props.cssVar}))` : undefined,
          }}
        >
          {props.showForegroundSample || isForegroundToken ? (
            <span class="flex size-full items-center justify-center text-xs font-semibold">Aa</span>
          ) : null}
        </div>
        <div class="min-w-0 flex-1 space-y-0.5">
          <div class="flex flex-wrap items-center gap-2">
            <code class="text-sm font-medium text-foreground">{props.name}</code>
            {props.status === "planned" ? (
              <span class="rounded bg-amber-100 px-1.5 py-0.5 text-[0.625rem] font-medium uppercase tracking-wide text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                planned
              </span>
            ) : null}
          </div>
          <code class="block text-xs text-muted-foreground">{props.cssVar}</code>
          {props.tailwindClass ? (
            <code class="block text-xs text-muted-foreground">{props.tailwindClass}</code>
          ) : null}
          {props.demoHex ? (
            <p class="text-xs text-muted-foreground">
              Demo: <span class="font-mono">{props.demoHex}</span>
              {props.demoRole ? ` — ${props.demoRole}` : ""}
            </p>
          ) : null}
        </div>
      </div>
    );
  },
});

export const ColorSwatchGrid = defineComponent({
  name: "ColorSwatchGrid",
  props: {
    tokens: { type: Array as PropType<SemanticColorToken[]>, required: true },
    classKey: { type: String as PropType<"tailwindBg" | "tailwindText">, default: "tailwindBg" },
  },
  setup(props) {
    return () => (
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {props.tokens.map((token) => (
          <ColorSwatch
            key={token.name}
            name={token.name}
            cssVar={token.cssVar}
            tailwindClass={token[props.classKey] ?? token.tailwindBg}
            demoHex={token.demoHex}
            demoRole={token.demoRole}
            status={token.status}
            showForegroundSample={token.name.includes("foreground")}
          />
        ))}
      </div>
    );
  },
});

export const DemoMappingTable = defineComponent({
  name: "DemoMappingTable",
  setup(_, { attrs }) {
    const rows = (attrs.rows ?? []) as Array<{
      demoHex: string;
      demoRole: string;
      tokenProposal: string;
      status: string;
    }>;

    return () => (
      <div class="overflow-x-auto rounded-lg border border-border">
        <table class="w-full min-w-[32rem] text-left text-sm">
          <thead class="border-b border-border bg-muted/50">
            <tr>
              <th class="px-4 py-2 font-medium text-foreground">Demo hex</th>
              <th class="px-4 py-2 font-medium text-foreground">Role</th>
              <th class="px-4 py-2 font-medium text-foreground">Token</th>
              <th class="px-4 py-2 font-medium text-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.demoHex}-${row.demoRole}`} class="border-b border-border last:border-0">
                <td class="px-4 py-2 font-mono text-xs">{row.demoHex}</td>
                <td class="px-4 py-2 text-muted-foreground">{row.demoRole}</td>
                <td class="px-4 py-2 font-mono text-xs">{row.tokenProposal}</td>
                <td class="px-4 py-2">
                  <span
                    class={cn(
                      "rounded px-1.5 py-0.5 text-[0.625rem] font-medium uppercase",
                      row.status === "planned"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
                    )}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  },
});

export const SpacingRuler = defineComponent({
  name: "SpacingRuler",
  props: {
    tokens: { type: Array as PropType<SpacingToken[]>, required: true },
  },
  setup(props) {
    return () => (
      <div class="space-y-2">
        {props.tokens.map((token) => (
          <div key={token.name} class="flex items-center gap-4">
            <code class="w-10 shrink-0 text-xs text-foreground">{token.name}</code>
            <div
              class="h-4 shrink-0 rounded-sm bg-primary/80"
              style={{ width: token.rem }}
              title={`${token.rem} / ${token.px}px`}
            />
            <span class="text-xs text-muted-foreground">
              {token.rem} · {token.px}px
            </span>
            <code class="hidden text-xs text-muted-foreground sm:inline">{token.tailwindClass}</code>
          </div>
        ))}
      </div>
    );
  },
});

export const SpacingTable = defineComponent({
  name: "SpacingTable",
  props: {
    tokens: { type: Array as PropType<SpacingToken[]>, required: true },
  },
  setup(props) {
    return () => (
      <div class="overflow-x-auto rounded-lg border border-border">
        <table class="w-full min-w-[36rem] text-left text-sm">
          <thead class="border-b border-border bg-muted/50">
            <tr>
              <th class="px-4 py-2 font-medium text-foreground">Token</th>
              <th class="px-4 py-2 font-medium text-foreground">rem</th>
              <th class="px-4 py-2 font-medium text-foreground">px @ 16px</th>
              <th class="px-4 py-2 font-medium text-foreground">Tailwind</th>
              <th class="px-4 py-2 font-medium text-foreground">SCSS mixin</th>
            </tr>
          </thead>
          <tbody>
            {props.tokens.map((token) => (
              <tr key={token.name} class="border-b border-border last:border-0">
                <td class="px-4 py-2 font-mono text-xs">{token.name}</td>
                <td class="px-4 py-2 font-mono text-xs">{token.rem}</td>
                <td class="px-4 py-2 text-muted-foreground">{token.px}px</td>
                <td class="px-4 py-2 font-mono text-xs">{token.tailwindClass}</td>
                <td class="px-4 py-2 font-mono text-xs text-muted-foreground">{token.scssMixin ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  },
});

export const RadiusPreview = defineComponent({
  name: "RadiusPreview",
  props: {
    name: { type: String, required: true },
    className: { type: String, default: "" },
    style: { type: Object as PropType<CSSProperties>, default: () => ({}) },
    value: { type: String, default: "" },
    note: { type: String, default: "" },
  },
  setup(props) {
    return () => (
      <div class="flex flex-col items-center gap-2">
        <div
          class={cn("size-20 border-2 border-primary bg-muted", props.className)}
          style={props.style}
        />
        <div class="text-center">
          <code class="text-xs font-medium text-foreground">{props.name}</code>
          {props.value ? <p class="text-xs text-muted-foreground">{props.value}</p> : null}
          {props.note ? <p class="max-w-[8rem] text-[0.625rem] text-muted-foreground">{props.note}</p> : null}
        </div>
      </div>
    );
  },
});

export const ShadowCard = defineComponent({
  name: "ShadowCard",
  props: {
    name: { type: String, required: true },
    shadow: { type: String, required: true },
    tailwindUtility: { type: String, required: true },
    demoKey: { type: String, default: "" },
    status: { type: String as PropType<"canonical" | "planned">, default: "planned" },
    usedOn: { type: String, default: "" },
  },
  setup(props) {
    return () => (
      <div class="flex flex-col gap-3">
        <div
          class="flex h-24 items-center justify-center rounded-xl border border-border bg-card text-sm text-muted-foreground"
          style={{ boxShadow: props.shadow }}
        >
          Preview
        </div>
        <div class="space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <code class="text-sm font-medium text-foreground">{props.name}</code>
            {props.status === "planned" ? (
              <span class="rounded bg-amber-100 px-1.5 py-0.5 text-[0.625rem] font-medium uppercase text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                planned
              </span>
            ) : null}
          </div>
          <code class="block text-xs text-muted-foreground">{props.tailwindUtility}</code>
          {props.demoKey ? <code class="block text-xs text-muted-foreground">{props.demoKey}</code> : null}
          {props.usedOn ? <p class="text-xs text-muted-foreground">Used on: {props.usedOn}</p> : null}
        </div>
      </div>
    );
  },
});

export const TokenStoryFrame = defineComponent({
  name: "TokenStoryFrame",
  setup(_, { slots }) {
    return () => (
      <div class="not-prose w-full max-w-5xl rounded-lg border border-border bg-background p-6 text-foreground">
        {slots.default?.()}
      </div>
    );
  },
});

/** Wraps content with explicit light-theme CSS variables for side-by-side comparison. */
export const LightThemeIsland = defineComponent({
  name: "LightThemeIsland",
  setup(_, { slots }) {
    const lightVars: CSSProperties = {
      "--background": "240 5% 96%",
      "--foreground": "240 4% 16%",
      "--muted": "240 5% 93%",
      "--muted-foreground": "240 4% 46%",
      "--card": "0 0% 100%",
      "--card-foreground": "240 10% 3.9%",
      "--border": "240 5.9% 90%",
      "--primary": "240 5.9% 10%",
      "--primary-foreground": "0 0% 98%",
    };

    return () => (
      <div
        class="rounded-lg border border-border bg-background p-4 text-foreground"
        style={lightVars as CSSProperties}
      >
        <p class="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Light</p>
        {slots.default?.()}
      </div>
    );
  },
});

export const DarkThemeIsland = defineComponent({
  name: "DarkThemeIsland",
  setup(_, { slots }) {
    const darkVars: CSSProperties = {
      "--background": "0 0% 7%",
      "--foreground": "0 0% 88%",
      "--muted": "0 0% 16%",
      "--muted-foreground": "0 0% 50%",
      "--card": "0 0% 10%",
      "--card-foreground": "0 0% 88%",
      "--border": "0 0% 18%",
      "--primary": "0 0% 98%",
      "--primary-foreground": "0 0% 10%",
    };

    return () => (
      <div
        class="rounded-lg border border-border bg-background p-4 text-foreground"
        style={darkVars as CSSProperties}
      >
        <p class="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Dark</p>
        {slots.default?.()}
      </div>
    );
  },
});

export function PlannedBrandSwatch(props: { name: string; demoHex: string; demoRole: string }) {
  return (
    <div class="flex items-start gap-3 rounded-lg border border-dashed border-amber-300 bg-amber-50/50 p-3 dark:border-amber-700 dark:bg-amber-950/20">
      <div
        class="size-12 shrink-0 rounded-md border border-dashed border-amber-400 bg-gradient-to-br from-indigo-400 to-indigo-600 opacity-60"
        title="Placeholder — CSS var not yet in main.css"
      />
      <div class="min-w-0 flex-1 space-y-0.5">
        <div class="flex flex-wrap items-center gap-2">
          <code class="text-sm font-medium text-foreground">{props.name}</code>
          <span class="rounded bg-amber-100 px-1.5 py-0.5 text-[0.625rem] font-medium uppercase text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
            planned
          </span>
        </div>
        <p class="text-xs text-muted-foreground">
          Demo: <span class="font-mono">{props.demoHex}</span> — {props.demoRole}
        </p>
      </div>
    </div>
  );
}

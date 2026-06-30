<script setup lang="ts">
import { Button, DotPattern, Input, Label } from "@/design-system";
import { Globe, Link2, Settings2 } from "lucide-vue-next";
import { ref } from "vue";

const accountName = ref("");
const apiKey = ref("");
const workspaceUrl = ref("");

const headerDotCluster = {
  rows: 12,
  cols: 8,
  dotSize: 2,
  gap: 3,
} as const;

/** Visual tokens — gradients and layered shadows stay in scoped CSS via v-bind. */
const tokens = {
  gradients: {
    pageBackground:
      "radial-gradient(ellipse 85% 65% at 18% 92%, rgba(255, 186, 148, 0.55) 0%, transparent 58%), " +
      "radial-gradient(ellipse 75% 55% at 82% 88%, rgba(147, 197, 253, 0.5) 0%, transparent 55%), " +
      "radial-gradient(ellipse 90% 70% at 50% 8%, rgba(237, 233, 254, 0.75) 0%, transparent 60%), " +
      "radial-gradient(ellipse 60% 45% at 65% 35%, rgba(254, 215, 170, 0.25) 0%, transparent 50%), " +
      "#f4f4f6",
    gridImage:
      "linear-gradient(rgba(0, 0, 0, 0.035) 1px, transparent 1px), " +
      "linear-gradient(90deg, rgba(0, 0, 0, 0.035) 1px, transparent 1px)",
    gridMask: "radial-gradient(ellipse 90% 80% at 50% 45%, black 20%, transparent 100%)",
    brandTradier: "linear-gradient(180deg, #5b8ba2 0%, #4a768d 100%)",
  },
  shadows: {
    card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 40px rgba(15, 23, 42, 0.1)",
    btnCancel: "0 1px 2px rgba(15, 23, 42, 0.05), 0 2px 6px rgba(15, 23, 42, 0.06)",
    btnCancelHover: "0 1px 2px rgba(15, 23, 42, 0.06), 0 3px 8px rgba(15, 23, 42, 0.08)",
    btnCancelActive: "0 1px 2px rgba(15, 23, 42, 0.05)",
  },
} as const;
</script>

<template>
  <div :class="[styles.root, 'fx-page']">
    <div :class="[styles.grid, 'fx-grid']" aria-hidden="true" />

    <div :class="[styles.card, 'fx-card']">
      <section :class="styles.main">
        <header :class="styles.header">
          <div :class="styles.headerRow">
            <DotPattern
              pattern="scatter-soft"
              :rows="headerDotCluster.rows"
              :cols="headerDotCluster.cols"
              :dot-size="headerDotCluster.dotSize"
              :gap="headerDotCluster.gap"
            />

            <div :class="styles.icons">
              <div :class="[styles.brand, styles.brandTradier, 'fx-brand-tradier']" aria-hidden="true">
                <span :class="styles.brandMark" />
              </div>

              <div :class="styles.linkBadge" aria-hidden="true">
                <Link2 :class="styles.linkIcon" stroke-width="2.25" />
              </div>

              <div :class="[styles.brand, styles.brandGithub]" aria-hidden="true">
                <svg viewBox="0 0 16 16" :class="styles.githubLogo" aria-hidden="true">
                  <path
                    fill="#ffffff"
                    d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.18.82.63-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.51-1.04 2.18-.82 2.18-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
                  />
                </svg>
              </div>
            </div>

            <DotPattern
              pattern="scatter"
              :rows="headerDotCluster.rows"
              :cols="headerDotCluster.cols"
              :dot-size="headerDotCluster.dotSize"
              :gap="headerDotCluster.gap"
              mirrored
            />
          </div>

          <h1 :class="styles.title">Connect Tradier to Github</h1>
          <p :class="styles.subtitle">
            Streamline your API requests by using Githubs SDK's and automate all your user tickets
          </p>
        </header>

        <form :class="styles.form" @submit.prevent>
          <div :class="styles.field">
            <Label for="account-name" :class="styles.label">Account Name</Label>
            <Input
              id="account-name"
              v-model="accountName"
              placeholder="e.g John Smith"
              :class="styles.input"
            />
          </div>

          <div :class="styles.field">
            <Label for="api-key" :class="styles.label">API Key</Label>
            <Input id="api-key" v-model="apiKey" placeholder="e.g 1231-23532FG34-A" :class="styles.input" />
          </div>

          <div :class="styles.field">
            <Label for="workspace-url" :class="styles.label">Workspace URL</Label>
            <div :class="styles.urlGroup">
              <span :class="styles.urlPrefix">https://</span>
              <Input
                id="workspace-url"
                v-model="workspaceUrl"
                placeholder="example@website.com"
                :class="[styles.input, styles.inputUrl]"
              />
            </div>
          </div>
        </form>

        <div :class="styles.divider" aria-hidden="true">
          <span :class="styles.dividerLine" />
          <span :class="styles.dividerIcon">
            <Settings2 class="size-3.5" stroke-width="2" />
          </span>
          <span :class="styles.dividerLine" />
        </div>

        <div :class="styles.actions">
          <button type="button" :class="[styles.btn, styles.btnCancel, 'fx-btn-cancel']">Cancel</button>
          <Button variant="flat" intent="primary" size="lg" :class="styles.btnNext">Next</Button>
        </div>

        <p :class="[styles.disclaimer, styles.disclaimerMain]">
          By clicking 'Next,' you confirm your intention to connect your app to Tradier API. This action
          signifies you accept of the Terms and conditions outlined.
          <a href="#" :class="styles.link">Terms and conditions</a>
        </p>
      </section>

      <footer :class="styles.footer">
        <div :class="styles.publicData">
          <div :class="styles.publicIcon" aria-hidden="true">
            <Globe class="size-4 text-muted-foreground" stroke-width="2" />
          </div>
          <div>
            <div :class="styles.publicTitle">Public Data</div>
            <div :class="styles.publicDesc">The data used in this connection is public data only.</div>
          </div>
        </div>

        <p :class="styles.disclaimer">
          By clicking 'Next,' you confirm your intention to connect your app to Tradier API. This action
          signifies you accept of the Terms and conditions outlined.
          <a href="#" :class="styles.link">Terms and conditions</a>
        </p>
      </footer>
    </div>
  </div>
</template>

<script lang="ts">
import { cn } from "@/design-system/utils";

const styles = {
  root: cn(
    ["relative flex min-h-screen items-center justify-center", "overflow-hidden px-5 py-10"].join(" "),
  ),
  grid: cn(["pointer-events-none absolute inset-0"].join(" ")),
  card: cn(
    [
      "relative z-[1] w-full max-w-[32rem] overflow-hidden rounded-[1.35rem]",
      "border border-[rgba(0,0,0,0.08)] bg-transparent",
    ].join(" "),
  ),
  main: cn(["bg-white px-8 pb-6 pt-8"].join(" ")),
  header: cn(["mb-7 flex flex-col items-center text-center"].join(" ")),
  headerRow: cn(["mb-5 flex w-full items-center justify-center gap-[1.35rem]"].join(" ")),
  icons: cn(["flex shrink-0 items-center"].join(" ")),
  brand: cn(
    ["flex size-14 items-center justify-center rounded-xl", "border border-[rgba(15,23,42,0.1)]"].join(" "),
  ),
  brandTradier: cn(["border-[rgba(255,255,255,0.55)]"].join(" ")),
  brandGithub: cn(["bg-[#24292f]"].join(" ")),
  brandMark: cn(["size-6 rounded-full bg-white"].join(" ")),
  linkBadge: cn(
    [
      "z-[1] -mx-[0.45rem] flex size-[1.625rem] items-center justify-center",
      "rounded-full border border-slate-200 bg-white",
    ].join(" "),
  ),
  githubLogo: cn(["block size-8"].join(" ")),
  linkIcon: cn(["size-3.5 text-slate-400"].join(" ")),
  title: cn(["m-0 mb-2 text-lg font-bold leading-[1.35] text-slate-900"].join(" ")),
  subtitle: cn(["m-0 max-w-[19rem] text-[0.8125rem] leading-normal text-slate-500"].join(" ")),
  form: cn(["flex flex-col gap-4"].join(" ")),
  field: cn(["flex flex-col gap-[0.4rem]"].join(" ")),
  label: cn(["text-[0.8125rem] font-semibold text-slate-700"].join(" ")),
  input: cn(
    ["h-10 rounded-lg border-slate-200 bg-white text-[0.8125rem]", "placeholder:text-slate-400"].join(" "),
  ),
  urlGroup: cn(
    ["flex items-stretch overflow-hidden rounded-lg", "border border-slate-200 bg-white"].join(" "),
  ),
  urlPrefix: cn(
    [
      "flex items-center whitespace-nowrap border-r border-slate-200",
      "bg-slate-50 px-3 text-[0.8125rem] text-slate-400",
    ].join(" "),
  ),
  inputUrl: cn(["flex-1 rounded-none border-0 shadow-none"].join(" ")),
  divider: cn(["mt-[1.35rem] mb-[1.15rem] flex items-center gap-3"].join(" ")),
  dividerLine: cn(["h-px flex-1 bg-slate-200"].join(" ")),
  dividerIcon: cn(
    [
      "flex size-7 items-center justify-center rounded-full",
      "border border-slate-200 bg-white text-slate-400",
    ].join(" "),
  ),
  actions: cn(["grid grid-cols-2 gap-3"].join(" ")),
  btn: cn(
    [
      "relative h-10 cursor-pointer rounded-lg text-sm font-medium leading-none",
      "transition-[background,box-shadow,transform] duration-150 ease-in-out",
    ].join(" "),
  ),
  btnCancel: cn(["border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"].join(" ")),
  btnNext: cn(["w-full rounded-xl"].join(" ")),
  disclaimer: cn(["mb-0 mt-4 text-[0.6875rem] leading-[1.55] text-slate-400"].join(" ")),
  disclaimerMain: cn(["mt-[0.85rem]"].join(" ")),
  link: cn(["text-link no-underline hover:underline"].join(" ")),
  footer: cn(
    [
      "border-t border-[rgba(0,0,0,0.08)] px-8 pb-[1.35rem] pt-[1.15rem]",
      "bg-[rgba(255,255,255,0.38)] backdrop-blur-[14px]",
    ].join(" "),
  ),
  publicData: cn(["mb-[0.85rem] flex items-start gap-3"].join(" ")),
  publicIcon: cn(
    [
      "flex size-8 shrink-0 items-center justify-center rounded-[0.45rem]",
      "border border-dashed border-slate-300 bg-[rgba(255,255,255,0.65)]",
    ].join(" "),
  ),
  publicTitle: cn(["mb-[0.15rem] text-[0.8125rem] font-semibold text-slate-900"].join(" ")),
  publicDesc: cn(["text-xs leading-[1.45] text-slate-500"].join(" ")),
};
</script>

<style scoped>
.fx-page {
  background: v-bind("tokens.gradients.pageBackground");
}

.fx-grid {
  background-image: v-bind("tokens.gradients.gridImage");
  background-size: 3rem 3rem;
  -webkit-mask-image: v-bind("tokens.gradients.gridMask");
  mask-image: v-bind("tokens.gradients.gridMask");
}

.fx-card {
  box-shadow: v-bind("tokens.shadows.card");
}

.fx-brand-tradier {
  background: v-bind("tokens.gradients.brandTradier");
}

.fx-btn-cancel {
  box-shadow: v-bind("tokens.shadows.btnCancel");
}

.fx-btn-cancel:hover {
  box-shadow: v-bind("tokens.shadows.btnCancelHover");
}

.fx-btn-cancel:active {
  box-shadow: v-bind("tokens.shadows.btnCancelActive");
}
</style>

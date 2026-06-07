<script setup lang="ts">
import { DotPattern, Input, Label } from "@/design-system";
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
</script>

<template>
  <div class="connect-demo">
    <div class="connect-demo__grid" aria-hidden="true" />

    <div class="connect-demo__card">
      <!-- Main surface -->
      <section class="connect-demo__main">
        <header class="connect-demo__header">
          <div class="connect-demo__header-row">
            <DotPattern
              pattern="scatter-soft"
              :rows="headerDotCluster.rows"
              :cols="headerDotCluster.cols"
              :dot-size="headerDotCluster.dotSize"
              :gap="headerDotCluster.gap"
            />

            <div class="connect-demo__icons">
              <div class="connect-demo__brand connect-demo__brand--tradier" aria-hidden="true">
                <span class="connect-demo__brand-mark" />
              </div>

              <div class="connect-demo__link-badge" aria-hidden="true">
                <Link2 class="connect-demo__link-icon" stroke-width="2.25" />
              </div>

              <div class="connect-demo__brand connect-demo__brand--github" aria-hidden="true">
                <svg viewBox="0 0 16 16" class="connect-demo__github-logo" aria-hidden="true">
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

          <h1 class="connect-demo__title">Connect Tradier to Github</h1>
          <p class="connect-demo__subtitle">
            Streamline your API requests by using Githubs SDK's and automate all your user tickets
          </p>
        </header>

        <form class="connect-demo__form" @submit.prevent>
          <div class="connect-demo__field">
            <Label for="account-name" class="connect-demo__label">Account Name</Label>
            <Input
              id="account-name"
              v-model="accountName"
              placeholder="e.g John Smith"
              class="connect-demo__input"
            />
          </div>

          <div class="connect-demo__field">
            <Label for="api-key" class="connect-demo__label">API Key</Label>
            <Input
              id="api-key"
              v-model="apiKey"
              placeholder="e.g 1231-23532FG34-A"
              class="connect-demo__input"
            />
          </div>

          <div class="connect-demo__field">
            <Label for="workspace-url" class="connect-demo__label">Workspace URL</Label>
            <div class="connect-demo__url-group">
              <span class="connect-demo__url-prefix">https://</span>
              <Input
                id="workspace-url"
                v-model="workspaceUrl"
                placeholder="example@website.com"
                class="connect-demo__input connect-demo__input--url"
              />
            </div>
          </div>
        </form>

        <div class="connect-demo__divider" aria-hidden="true">
          <span class="connect-demo__divider-line" />
          <span class="connect-demo__divider-icon">
            <Settings2 class="size-3.5" stroke-width="2" />
          </span>
          <span class="connect-demo__divider-line" />
        </div>

        <div class="connect-demo__actions">
          <button type="button" class="connect-demo__btn connect-demo__btn--cancel">Cancel</button>
          <button type="button" class="connect-demo__btn connect-demo__btn--next">Next</button>
        </div>

        <p class="connect-demo__disclaimer connect-demo__disclaimer--main">
          By clicking 'Next,' you confirm your intention to connect your app to Tradier API. This action
          signifies you accept of the Terms and conditions outlined.
          <a href="#" class="connect-demo__link">Terms and conditions</a>
        </p>
      </section>

      <!-- Frosted footer surface -->
      <footer class="connect-demo__footer">
        <div class="connect-demo__public-data">
          <div class="connect-demo__public-icon" aria-hidden="true">
            <Globe class="size-4 text-muted-foreground" stroke-width="2" />
          </div>
          <div>
            <div class="connect-demo__public-title">Public Data</div>
            <div class="connect-demo__public-desc">The data used in this connection is public data only.</div>
          </div>
        </div>

        <p class="connect-demo__disclaimer">
          By clicking 'Next,' you confirm your intention to connect your app to Tradier API. This action
          signifies you accept of the Terms and conditions outlined.
          <a href="#" class="connect-demo__link">Terms and conditions</a>
        </p>
      </footer>
    </div>
  </div>
</template>

<style scoped lang="scss">
.connect-demo {
  position: relative;
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 1.25rem;
  overflow: hidden;
  background: radial-gradient(ellipse 85% 65% at 18% 92%, rgba(255, 186, 148, 0.55) 0%, transparent 58%),
    radial-gradient(ellipse 75% 55% at 82% 88%, rgba(147, 197, 253, 0.5) 0%, transparent 55%),
    radial-gradient(ellipse 90% 70% at 50% 8%, rgba(237, 233, 254, 0.75) 0%, transparent 60%),
    radial-gradient(ellipse 60% 45% at 65% 35%, rgba(254, 215, 170, 0.25) 0%, transparent 50%), #f4f4f6;
}

.connect-demo__grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: linear-gradient(rgba(0, 0, 0, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 0, 0, 0.035) 1px, transparent 1px);
  background-size: 3rem 3rem;
  mask-image: radial-gradient(ellipse 90% 80% at 50% 45%, black 20%, transparent 100%);
}

.connect-demo__card {
  position: relative;
  z-index: 1;
  width: min(100%, 32rem);
  border-radius: 1.35rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: transparent;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 12px 40px rgba(15, 23, 42, 0.1);
  overflow: hidden;
}

.connect-demo__main {
  padding: 2rem 2rem 1.5rem;
  background: #fff;
}

.connect-demo__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 1.75rem;
}

.connect-demo__header-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.35rem;
  width: 100%;
  margin-bottom: 1.25rem;
}

.connect-demo__icons {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.connect-demo__brand {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(15, 23, 42, 0.1);

  &--tradier {
    border-color: rgba(255, 255, 255, 0.55);
    background: linear-gradient(180deg, #5b8ba2 0%, #4a768d 100%);
  }

  &--github {
    background: #24292f;
  }
}

.connect-demo__brand-mark {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  background: #fff;
}

.connect-demo__link-badge {
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.625rem;
  height: 1.625rem;
  margin: 0 -0.45rem;
  border-radius: 9999px;
  border: 1px solid #e2e8f0;
  background: #fff;
}

.connect-demo__github-logo {
  display: block;
  width: 2rem;
  height: 2rem;
}

.connect-demo__link-icon {
  width: 0.875rem;
  height: 0.875rem;
  color: #94a3b8;
}

.connect-demo__title {
  margin: 0 0 0.5rem;
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1.35;
  color: #0f172a;
}

.connect-demo__subtitle {
  margin: 0;
  max-width: 19rem;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: #64748b;
}

.connect-demo__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.connect-demo__field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.connect-demo__label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #334155;
}

.connect-demo__input {
  height: 2.5rem;
  border-radius: 0.5rem;
  border-color: #e2e8f0;
  background: #fff;
  font-size: 0.8125rem;

  &::placeholder {
    color: #94a3b8;
  }
}

.connect-demo__url-group {
  display: flex;
  align-items: stretch;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  background: #fff;
}

.connect-demo__url-prefix {
  display: flex;
  align-items: center;
  padding: 0 0.75rem;
  font-size: 0.8125rem;
  color: #94a3b8;
  background: #f8fafc;
  border-right: 1px solid #e2e8f0;
  white-space: nowrap;
}

.connect-demo__input--url {
  flex: 1;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.connect-demo__divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1.35rem 0 1.15rem;
}

.connect-demo__divider-line {
  flex: 1;
  height: 1px;
  background: #e2e8f0;
}

.connect-demo__divider-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 9999px;
  border: 1px solid #e2e8f0;
  color: #94a3b8;
  background: #fff;
}

.connect-demo__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.connect-demo__btn {
  position: relative;
  height: 2.5rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  transition:
    background 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;

  &--cancel {
    border: 1px solid #e5e7eb;
    background: #fff;
    color: #374151;
    box-shadow:
      0 1px 2px rgba(15, 23, 42, 0.05),
      0 2px 6px rgba(15, 23, 42, 0.06);

    &:hover {
      background: #fafafa;
      box-shadow:
        0 1px 2px rgba(15, 23, 42, 0.06),
        0 3px 8px rgba(15, 23, 42, 0.08);
    }

    &:active {
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
    }
  }

  &--next {
    border-radius: 0.75rem;
    border: 1px solid #3f3ec8;
    color: #fff;
    font-weight: 600;
    letter-spacing: -0.01em;
    background: linear-gradient(180deg, #5d5cff 0%, #5453f2 52%, #4a49e0 100%);
    box-shadow:
      inset 0 0 1px 1px rgba(255, 255, 255, 0.5),
      0 1px 0 rgba(63, 62, 200, 0.22),
      0 2px 4px rgba(58, 57, 180, 0.4);

    &:hover {
      background: linear-gradient(180deg, #6564ff 0%, #5a59f4 52%, #504fe6 100%);
      box-shadow:
        inset 0 0 1px 1px rgba(255, 255, 255, 0.52),
        0 1px 0 rgba(63, 62, 200, 0.22),
        0 3px 6px rgba(58, 57, 180, 0.28);
    }

    &:active {
      background: linear-gradient(180deg, #5453f2 0%, #4a49e0 100%);
      box-shadow:
        inset 0 1px 2px rgba(47, 46, 150, 0.35),
        0 1px 0 rgba(63, 62, 200, 0.14),
        0 1px 2px rgba(58, 57, 180, 0.4);
    }
  }
}

.connect-demo__disclaimer {
  margin: 1rem 0 0;
  font-size: 0.6875rem;
  line-height: 1.55;
  color: #94a3b8;

  &--main {
    margin-top: 0.85rem;
  }
}

.connect-demo__link {
  color: #6366f1;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.connect-demo__footer {
  padding: 1.15rem 2rem 1.35rem;
  background: rgba(255, 255, 255, 0.38);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.connect-demo__public-data {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.connect-demo__public-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  border-radius: 0.45rem;
  border: 1px dashed #cbd5e1;
  background: rgba(255, 255, 255, 0.65);
}

.connect-demo__public-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 0.15rem;
}

.connect-demo__public-desc {
  font-size: 0.75rem;
  line-height: 1.45;
  color: #64748b;
}
</style>

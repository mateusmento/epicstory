<script setup lang="ts">
import { UnauthorizedException } from "@/core/axios";
import { TooltipProvider } from "@/design-system";
import { Toaster } from "@/design-system/ui/sonner";
import { onErrorCaptured, ref } from "vue";
import { RouterView, useRouter } from "vue-router";

const router = useRouter();

/**
 * Vue Router lazy routes (`() => import(...)`) do not trigger parent Suspense; only async
 * setup / top-level await and async descendants do. See:
 * https://vuejs.org/guide/built-ins/suspense#combining-with-other-components
 * Router pending covers chunk/guard time; Suspense fallback covers async setup after mount.
 */
const isRouterPending = ref(false);
router.beforeEach(() => {
  isRouterPending.value = true;
});
router.afterEach(() => {
  isRouterPending.value = false;
});

onErrorCaptured((err) => {
  if (err instanceof UnauthorizedException) {
    router.push({ name: "signin" });
  }
});
</script>

<template>
  <TooltipProvider>
    <Teleport to="body">
      <Toaster position="top-center" :expand="true" :rich-colors="true" close-button />
    </Teleport>

    <!-- Matches Vue docs: Suspense #default must be one immediate child (no v-if on it). -->
    <div
      v-if="isRouterPending"
      class="fixed inset-0 z-[100] flex flex:center bg-background/80 py-4xl backdrop-blur-sm"
      aria-busy="true"
      aria-live="polite"
    >
      <div class="flex:col-4xl">
        <h1 class="title text-red-700 text-foreground">Loading the page...</h1>
        <div class="subtitle text-secondary-foreground">Please wait while we load the page.</div>
      </div>
    </div>

    <RouterView v-slot="{ Component }">
      <template v-if="Component">
        <!-- timeout 0: show fallback immediately when the default root is replaced (Vue Suspense docs). -->
        <Suspense timeout="0">
          <!-- Suspense must wrap the async route component directly so fallback runs for
               lazy chunks + async setup (e.g. Dashboard top-level await). Wrapping only
               TooltipProvider prevented the boundary from seeing the route’s async work. -->
          <component :is="Component" />
          <template #fallback>
            <div class="flex flex:center h-full min-h-[50vh] py-4xl">
              <div class="flex:col-4xl">
                <h1 class="title text-foreground">Loading workspace...</h1>
                <div class="subtitle text-secondary-foreground">Please wait while we load the page.</div>
              </div>
            </div>
          </template>
        </Suspense>
      </template>
    </RouterView>
  </TooltipProvider>
</template>

<style scoped></style>

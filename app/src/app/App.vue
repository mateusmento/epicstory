<script setup lang="ts">
import { UnauthorizedException } from "@/core/axios";
import { TooltipProvider } from "@/design-system";
import { Suspense, onErrorCaptured } from "vue";
import { RouterView, useRouter } from "vue-router";

const router = useRouter();

onErrorCaptured((err) => {
  if (err instanceof UnauthorizedException) {
    router.push({ name: "signin" });
  }
});
</script>

<template>
  <RouterView #default="{ Component }">
    <Suspense timeout="0">
      <template #default>
        <TooltipProvider>
          <component :is="Component"></component>
        </TooltipProvider>
      </template>

      <template #fallback>
        <div class="flex flex:center h-full py-4xl">
          <div class="flex:col-4xl">
            <h1 class="title text-foreground">Loading...</h1>
            <div class="subtitle text-secondary-foreground">Please wait while we load the page.</div>
          </div>
        </div>
      </template>
    </Suspense>
  </RouterView>
</template>

<style scoped></style>

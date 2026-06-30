<script setup lang="ts">
import AuthMarketingAside from "./AuthMarketingAside.vue";
</script>

<template>
  <main class="auth-page flex flex:center h-full py-4xl">
    <div class="auth-card signup w-xl h-full rounded-3xl flex:row-md p-xl">
      <AuthMarketingAside>
        <template #headline>
          <slot name="headline" />
        </template>
        <template #subtitle>
          <slot name="subtitle" />
        </template>
      </AuthMarketingAside>

      <section class="auth-form-column signup-form flex:col-7xl flex:center-y flex-1 mx-6xl">
        <slot />
      </section>
    </div>
  </main>
</template>

<style lang="scss" scoped>
.auth-page {
  background-color: oklch(var(--background));
  font-family: "Plus Jakarta Sans";
}

.auth-card {
  background-color: oklch(var(--card));
}

.auth-form-column {
  font-family: "Inter";
}
</style>

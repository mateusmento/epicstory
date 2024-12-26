<script setup lang="ts">
import { UnauthorizedException } from "@/core/axios";
import { onErrorCaptured } from "vue";
import { RouterView, useRouter } from "vue-router";

const router = useRouter();

onErrorCaptured((err) => {
  if (err instanceof UnauthorizedException) {
    router.push({ name: "signin" });
  }
});
</script>

<template>
  <RouterView />
</template>

<style scoped></style>

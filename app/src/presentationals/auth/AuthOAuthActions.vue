<script setup lang="ts">
import { Button } from "@/design-system";
import { IconGoogle } from "@/design-system/icons";

defineProps<{
  googleHref: string;
  googleTestId?: string;
}>();
</script>

<template>
  <div class="flex:row-2xl flex:center text-slate-800">
    <div class="border border-solid border-slate-200 flex-1"></div>
    or
    <div class="border border-solid border-slate-200 flex-1"></div>
  </div>

  <Button
    as="a"
    :href="googleHref"
    class="flex:row-lg w-full"
    :data-testid="googleTestId ?? 'signup-with-google'"
  >
    <IconGoogle class="h-8" />
    Continue with Google
  </Button>
</template>

<!-- Write me a error view that displays a message and a button to go back to the signin page. Use the design system to style the page. -->
<script setup lang="ts">
import { Button } from "@/design-system";
import { useRouter } from "vue-router";

const router = useRouter();
</script>

<template>
  <main class="flex flex:center h-full py-4xl">
    <div class="flex:col-4xl">
      <div class="flex:col-xl">
        <h1 class="title text-foreground">Error</h1>
        <div class="text-secondary-foreground">An error occurred while loading the page.</div>
      </div>
      <Button class="self-center" @click="router.push('/signin')">Go back to signin</Button>
    </div>
  </main>
</template>

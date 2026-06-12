<script setup lang="ts">
import { config } from "@/config";
import { useDependency } from "@/core/dependency-injection";
import { AuthPageShell, SigninForm } from "@/presentationals/auth";
import { AuthApi } from "@epicstory/api-client";
import type { SigninRequest } from "@epicstory/contracts";
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

const router = useRouter();
const route = useRoute();
const authApi = useDependency(AuthApi);

const email = ref(typeof route.query.email === "string" ? route.query.email : "");

const googleHref = computed(() => {
  const redirectPath = typeof route.query.redirect === "string" ? route.query.redirect : "/";
  const params = new URLSearchParams({ redirect: redirectPath });
  return `${config.API_URL}/auth/google?${params.toString()}`;
});

async function signin(data: SigninRequest) {
  await authApi.signin(data);

  const redirectPath = typeof route.query.redirect === "string" ? route.query.redirect : "/";
  router.push(redirectPath);
}
</script>

<template>
  <AuthPageShell>
    <template #headline>
      <h1 class="headline_title font-semibold">
        Create epic<br />
        stories with us.
      </h1>
    </template>
    <template #subtitle>
      <p class="headline_subtitle">
        Discover a better communication<br />
        tool for Scrum teams.
      </p>
    </template>

    <SigninForm v-model:email="email" :google-href="googleHref" @submit="signin" />
  </AuthPageShell>
</template>

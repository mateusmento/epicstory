<script setup lang="ts">
import { config } from "@/config";
import { useDependency } from "@/core/dependency-injection";
import { AuthPageShell, SignupForm } from "@/presentationals/auth";
import { AuthApi } from "@epicstory/api-client";
import type { SignupRequest } from "@epicstory/contracts";
import { useRouter } from "vue-router";

const router = useRouter();
const authApi = useDependency(AuthApi);

const googleHref = `${config.API_URL}/auth/google`;

async function signup(data: SignupRequest) {
  const user = await authApi.signup(data);
  router.push({ name: "signin", query: { email: user.email } });
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

    <SignupForm :google-href="googleHref" @submit="signup" />
  </AuthPageShell>
</template>

<script setup lang="ts">
import { Button, Field, Form } from "@/design-system";
import type { SigninRequest } from "@epicstory/contracts";
import AuthOAuthActions from "./AuthOAuthActions.vue";

defineProps<{
  googleHref: string;
}>();

const email = defineModel<string>("email", { default: "" });

const emit = defineEmits<{
  (e: "submit", data: SigninRequest): void;
}>();

function onSubmit(data: SigninRequest) {
  emit("submit", data);
}
</script>

<template>
  <div class="flex:col-xl">
    <h2 class="title text-foreground">Sign in</h2>
    <div class="subtitle text-secondary-foreground">Continue your journey with Epicstory.</div>
  </div>

  <Form class="flex:col-3xl" @submit="onSubmit" data-testid="signup-form">
    <Field
      class="flex:col-xl"
      v-model="email"
      label="Email"
      name="email"
      placeholder="Enter your email"
      data-testid="signin-email-input"
    />
    <Field
      class="flex:col-xl"
      type="password"
      label="Password"
      name="password"
      placeholder="Enter your password"
      data-testid="signin-password-input"
    />
    <div class="text-sm">
      Don't have an account yet?
      <RouterLink to="/signup" class="text-blue-600">Sign up.</RouterLink>
    </div>

    <div class="flex:col-2xl mt-3xl">
      <Button
        type="submit"
        variant="primary"
        elevation="elevated"
        size="lg"
        class="w-full"
        data-testid="signin-submit-button"
      >
        Sign in
      </Button>
    </div>

    <AuthOAuthActions :google-href="googleHref" />
  </Form>
</template>

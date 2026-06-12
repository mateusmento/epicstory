<script setup lang="ts">
import { Button, Field, Form } from "@/design-system";
import type { SignupRequest } from "@epicstory/contracts";
import type { SubmissionHandler } from "vee-validate";
import AuthOAuthActions from "./AuthOAuthActions.vue";

defineProps<{
  googleHref: string;
}>();

const emit = defineEmits<{
  (e: "submit", data: SignupRequest): void;
}>();

function onSubmit(data: SignupRequest) {
  emit("submit", data);
}
</script>

<template>
  <div class="flex:col-xl">
    <h2 class="title text-foreground">Sign up</h2>
    <div class="subtitle text-secondary-foreground">Start your journey with Epicstory.</div>
  </div>

  <Form
    class="flex:col-3xl"
    @submit="onSubmit as SubmissionHandler<SignupRequest, SignupRequest>"
    data-testid="signup-form"
  >
    <Field class="flex:col-xl" label="Name" name="name" placeholder="Name" data-testid="signup-name-input" />
    <Field
      class="flex:col-xl"
      label="Email"
      name="email"
      placeholder="Enter your email"
      data-testid="signup-email-input"
    />
    <Field
      class="flex:col-xl"
      type="password"
      label="Password"
      name="password"
      placeholder="Create password"
      data-testid="signup-password-input"
    />
    <div class="text-sm">
      Already have an account?
      <RouterLink to="/signin" class="text-blue-600">Sign in.</RouterLink>
    </div>

    <div class="flex:col-2xl mt-3xl">
      <Button type="submit" legacy legacy-variant="invitational" class="w-full" data-testid="signup-button">
        Create account
      </Button>
    </div>

    <AuthOAuthActions :google-href="googleHref" />
  </Form>
</template>

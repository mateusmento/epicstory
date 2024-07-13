<script setup lang="ts">
import { Button } from "@/components/button";
import { Field } from "@/components/form";
import { Form } from "@/components/form";
import { useDependency } from "@/core/dependency-injection";
import { AuthService } from "@/domain/auth/auth.service";
import type { SigninRequest } from "@/domain/auth/dtos/singin.dto";
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";

const router = useRouter();
const route = useRoute();

const authService = useDependency(AuthService);

const signinEmail = ref<string>(typeof route.query.email === "string" ? route.query.email : "");

async function signin(data: SigninRequest) {
  await authService.signin(data);
  router.push("/dashboard");
}
</script>

<template>
  <main>
    <h1>Sign in</h1>
    <h2>Continue your journey with Epicstory.</h2>
    <Form @submit="signin">
      <Field v-model="signinEmail" label="Email" name="email" data-testid="signin-email-input" />
      <Field type="password" label="Password" name="password" data-testid="signin-password-input" />
      <Button variant="invitational" size="md" type="submit" data-testid="signin-submit-button">
        Sign in
      </Button>
    </Form>
  </main>
</template>

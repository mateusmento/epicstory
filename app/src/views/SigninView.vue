<script setup lang="ts">
import { Input } from '@/components/ui/input';
import { FormControl, FormMessage } from '@/components/ui/form';
import { FormLabel } from '@/components/ui/form';
import { FormItem } from '@/components/ui/form';
import { FormField } from '@/components/ui/form';
import Button from '@/components/ui/button/Button.vue';
import { toTypedSchema } from '@vee-validate/zod';
import { z } from 'zod';
import { useDependency } from '@/core/dependency-injection';
import { AuthService } from '@/domain/auth/auth.service';
import { useForm } from 'vee-validate';
import { useRouter } from 'vue-router';
import { Form } from '@/components/form';
import { Field } from '@/components/field';
import { vButton } from '@mateussarmento/epicstory-ui';

const router = useRouter();
const authService = useDependency(AuthService);

const formSchema = toTypedSchema(
  z.object({
    email: z
      .string()
      .email()
      .transform((v) => v.slice(0, 255)),
    password: z.string().transform((v) => v.slice(0, 255)),
  }),
);

const form = useForm({
  validationSchema: formSchema,
});

const signin = form.handleSubmit(async (values) => {
  await authService.signin(values);
  router.push('/');
});
</script>

<template>
  <div class="flex min-h-screen flex-1 flex-col justify-center px-6 py-12 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-sm">
      <img
        class="mx-auto h-10 w-auto"
        src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600"
        alt="Your Company"
      />
      <h2 class="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
        Sign in to your account
      </h2>
    </div>

    <div class="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
      <Form @submit="signin">
        <Field label="Email" name="email" data-testid="signin-email-input" />
        <Field
          type="password"
          label="Password"
          name="password"
          data-testid="signin-password-input"
        />
        <vButton variant="invitational" size="md" type="submit" data-testid="signin-submit-button">
          Sign in
        </vButton>
      </Form>

      <form class="space-y-6" @submit="signin">
        <FormField v-slot="{ componentField }" name="email" required>
          <FormItem>
            <FormLabel>Email address</FormLabel>
            <FormControl>
              <Input type="email" placeholder="email" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="password" required>
          <FormItem>
            <div class="flex items-center justify-between">
              <FormLabel>Password</FormLabel>
              <div class="text-sm">
                <a href="#" class="font-semibold text-indigo-600 hover:text-indigo-500"
                  >Forgot password?</a
                >
              </div>
            </div>

            <FormControl>
              <Input type="password" placeholder="password" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <div>
          <Button type="submit" class="w-full">Sign in</Button>
        </div>
      </form>

      <p class="mt-10 text-center text-sm text-gray-500">
        Not a member?
        {{ ' ' }}
        <a href="/signup" class="font-semibold leading-6 text-indigo-600 hover:text-indigo-500"
          >Start a 14 day free trial</a
        >
      </p>
    </div>
  </div>
</template>

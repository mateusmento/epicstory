<script setup lang="ts">
import { Input } from '@/components/ui/input';
import { FormControl, FormMessage } from '@/components/ui/form';
import { FormLabel } from '@/components/ui/form';
import { FormItem } from '@/components/ui/form';
import { FormField } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { useDependency } from '@/core/dependency-injection';
import { AuthService } from '@/domain/auth/auth.service';
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import * as z from 'zod';
import { useRouter } from 'vue-router';

const authService = useDependency(AuthService);

const formSchema = toTypedSchema(
  z.object({
    name: z.string().min(2).max(255),
    email: z.string().email().max(255),
    password: z.string().min(8).max(255),
  }),
);

const form = useForm({
  validationSchema: formSchema,
});

const router = useRouter();

const signup = form.handleSubmit(async (values) => {
  await authService.signup(values);
  router.push('/signin');
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
        Create a new account
      </h2>
    </div>

    <div class="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
      <form class="space-y-6" @submit="signup">
        <FormField v-slot="{ componentField }" name="name" required>
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input placeholder="name" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="email" required>
          <FormItem>
            <FormLabel>Email address</FormLabel>
            <FormControl>
              <Input type="email" placeholder="name" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="password" required>
          <FormItem>
            <FormLabel>Password</FormLabel>
            <FormControl>
              <Input type="password" placeholder="password" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <div>
          <Button type="submit" class="w-full">Sign up</Button>
        </div>
      </form>

      <p class="mt-10 text-center text-sm text-gray-500">
        Already a member?
        {{ ' ' }}
        <a href="/signin" class="font-semibold leading-6 text-indigo-600 hover:text-indigo-500"
          >Sign in</a
        >
      </p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Button, Field, Form, Separator } from "@/design-system";
import UserPictureUpload from "./UserPictureUpload.vue";
import { useUser } from "@/domain/user";
import { ref } from "vue";

const { user, updateUser } = useUser();
const isSaving = ref(false);
const saveSuccess = ref(false);

async function handleSubmit(data: { name?: string }) {
  isSaving.value = true;
  saveSuccess.value = false;
  try {
    await updateUser(data);
    saveSuccess.value = true;
    setTimeout(() => {
      saveSuccess.value = false;
    }, 3000);
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div v-if="user" class="max-w-2xl mx-auto px-6 py-8">
    <!-- Page Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-semibold text-foreground mb-2">Profile Settings</h1>
      <p class="text-sm text-muted-foreground">Manage your account information and preferences</p>
    </div>

    <!-- Profile Picture Section -->
    <div class="mb-8">
      <h2 class="text-lg font-semibold text-foreground mb-4">Profile Picture</h2>
      <UserPictureUpload />
    </div>

    <Separator class="my-8" />

    <!-- Account Information Section -->
    <div class="mb-8">
      <h2 class="text-lg font-semibold text-foreground mb-4">Account Information</h2>
      <Form @submit="handleSubmit($event)" :initial-values="user" class="flex:col-lg">
        <div class="space-y-4">
          <Field name="name" label="Display Name" />
          
          <!-- Email (Read-only) -->
          <div class="field">
            <label class="text-sm font-semibold text-foreground mb-2 block">Email</label>
            <input
              type="email"
              :value="user.email"
              disabled
              class="w-full px-4 py-2 border border-input bg-muted rounded-md text-muted-foreground cursor-not-allowed"
            />
            <p class="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
          </div>
        </div>

        <div class="flex items-center gap-3 mt-6">
          <Button type="submit" :disabled="isSaving" size="sm">
            {{ isSaving ? "Saving..." : "Save Changes" }}
          </Button>
          <span
            v-if="saveSuccess"
            class="text-sm text-green-600 dark:text-green-400 flex items-center gap-1"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            Saved successfully
          </span>
        </div>
      </Form>
    </div>
  </div>
</template>

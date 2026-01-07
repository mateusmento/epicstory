<script lang="ts" setup>
import { Button, Field, Form, Separator } from "@/design-system";
import UserPictureUpload from "./UserPictureUpload.vue";
import { useUser } from "@/domain/user";
import { ref } from "vue";

const { user, updateUser, changePassword } = useUser();
const isSaving = ref(false);
const saveSuccess = ref(false);

const isChangingPassword = ref(false);
const passwordChangeSuccess = ref(false);
const passwordError = ref<string>("");

const passwordFormData = ref({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});

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

async function handlePasswordChange() {
  passwordError.value = "";
  passwordChangeSuccess.value = false;

  // Validation
  // if (!passwordFormData.value.currentPassword) {
  //   passwordError.value = "Current password is required";
  //   return;
  // }

  if (!passwordFormData.value.newPassword) {
    passwordError.value = "New password is required";
    return;
  }

  if (passwordFormData.value.newPassword.length < 6) {
    passwordError.value = "New password must be at least 6 characters";
    return;
  }

  if (passwordFormData.value.newPassword !== passwordFormData.value.confirmPassword) {
    passwordError.value = "New passwords do not match";
    return;
  }

  if (passwordFormData.value.currentPassword === passwordFormData.value.newPassword) {
    passwordError.value = "New password must be different from current password";
    return;
  }

  isChangingPassword.value = true;

  try {
    await changePassword({
      currentPassword: passwordFormData.value.currentPassword,
      newPassword: passwordFormData.value.newPassword,
    });

    passwordChangeSuccess.value = true;
    passwordFormData.value = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };

    setTimeout(() => {
      passwordChangeSuccess.value = false;
    }, 3000);
  } catch (error: any) {
    passwordError.value =
      error?.response?.data?.message || "Failed to change password. Please check your current password.";
  } finally {
    isChangingPassword.value = false;
  }
}
</script>

<template>
  <div class="flex h-full overflow-y-auto">
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
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Saved successfully
            </span>
          </div>
        </Form>
      </div>

      <Separator class="my-8" />

      <!-- Change Password Section -->
      <div class="mb-8">
        <h2 class="text-lg font-semibold text-foreground mb-4">Change Password</h2>
        <div class="flex:col-lg">
          <div class="space-y-4">
            <div class="field">
              <label class="text-sm font-semibold text-foreground mb-2 block">Current Password</label>
              <input
                type="password"
                v-model="passwordFormData.currentPassword"
                placeholder="Enter your current password"
                class="w-full px-4 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                :disabled="isChangingPassword"
              />
            </div>

            <div class="field">
              <label class="text-sm font-semibold text-foreground mb-2 block">New Password</label>
              <input
                type="password"
                v-model="passwordFormData.newPassword"
                placeholder="Enter your new password"
                class="w-full px-4 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                :disabled="isChangingPassword"
              />
            </div>

            <div class="field">
              <label class="text-sm font-semibold text-foreground mb-2 block">Confirm New Password</label>
              <input
                type="password"
                v-model="passwordFormData.confirmPassword"
                placeholder="Confirm your new password"
                class="w-full px-4 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                :disabled="isChangingPassword"
                @keyup.enter="handlePasswordChange"
              />
            </div>
          </div>

          <div
            v-if="passwordError"
            class="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md"
          >
            <p class="text-sm text-destructive">{{ passwordError }}</p>
          </div>

          <div class="flex items-center gap-3 mt-6">
            <Button type="button" @click="handlePasswordChange" :disabled="isChangingPassword" size="sm">
              {{ isChangingPassword ? "Changing Password..." : "Change Password" }}
            </Button>
            <span
              v-if="passwordChangeSuccess"
              class="text-sm text-green-600 dark:text-green-400 flex items-center gap-1"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Password changed successfully
            </span>
          </div>

          <p class="text-xs text-muted-foreground mt-3">Password must be at least 6 characters long.</p>
        </div>
      </div>
    </div>
  </div>
</template>

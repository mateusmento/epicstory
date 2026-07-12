<script lang="ts" setup>
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Form,
  Input,
  Label,
  ScrollArea,
} from "@/design-system";
import UserPictureUpload from "@/containers/views/user/UserPictureUpload.vue";
import { useUser } from "@/domain/user";
import { ThemePicker } from "@/presentationals/theme";
import { Loader2 } from "lucide-vue-next";
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { toast } from "vue-sonner";

const { user, updateUser, changePassword, listOwnedWorkspaces, deleteAccount } = useUser();
const isSaving = ref(false);

const isChangingPassword = ref(false);
const passwordError = ref("");

const passwordFormData = ref({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});

const ownedWorkspaces = ref<{ id: number; name: string }[]>([]);
const isLoadingOwned = ref(false);
const deleteOpen = ref(false);
const isDeletingAccount = ref(false);
const deleteError = ref("");

onMounted(async () => {
  isLoadingOwned.value = true;
  try {
    ownedWorkspaces.value = await listOwnedWorkspaces();
  } finally {
    isLoadingOwned.value = false;
  }
});

async function confirmDeleteAccount() {
  deleteError.value = "";
  isDeletingAccount.value = true;
  try {
    await deleteAccount();
  } catch (error: unknown) {
    const msg =
      error && typeof error === "object" && "response" in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
    deleteError.value = msg || "Could not delete account. Transfer ownership of any owned workspaces first.";
    ownedWorkspaces.value = await listOwnedWorkspaces().catch(() => ownedWorkspaces.value);
  } finally {
    isDeletingAccount.value = false;
  }
}

async function handleSubmit(data: { name?: string }) {
  isSaving.value = true;
  try {
    await updateUser(data);
    toast.success("Profile saved");
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : "Could not save profile.");
  } finally {
    isSaving.value = false;
  }
}

async function handlePasswordChange() {
  passwordError.value = "";

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

    passwordFormData.value = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };
    toast.success("Password updated");
  } catch (error: unknown) {
    const msg =
      error && typeof error === "object" && "response" in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
    passwordError.value = msg || "Failed to change password. Please check your current password.";
  } finally {
    isChangingPassword.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <ScrollArea class="min-h-0 flex-1">
      <div class="!block max-w-3xl p-6 pb-10">
        <h1 class="text-lg font-semibold tracking-tight">Profile</h1>
        <p class="mt-1 max-w-xl text-sm text-secondary-foreground">
          Manage your account, appearance, and sign-in credentials.
        </p>

        <div
          v-if="!user"
          class="mt-6 flex items-center justify-center gap-2 rounded-lg border bg-card py-12 text-sm text-secondary-foreground shadow-sm"
        >
          <Loader2 class="size-4 animate-spin" />
          Loading profile…
        </div>

        <template v-else>
          <!-- Photo -->
          <section class="mt-6 rounded-lg border border-border bg-card shadow-sm">
            <div class="border-b border-border px-4 py-3">
              <h2 class="text-sm font-medium">Photo</h2>
              <p class="mt-1 text-xs text-secondary-foreground">
                Shown next to your name in issues, chat, and the member list.
              </p>
            </div>
            <div class="p-4">
              <UserPictureUpload />
            </div>
          </section>

          <!-- Account -->
          <section class="mt-4 rounded-lg border border-border bg-card shadow-sm">
            <div class="border-b border-border px-4 py-3">
              <h2 class="text-sm font-medium">Account</h2>
              <p class="mt-1 text-xs text-secondary-foreground">
                How you appear to teammates in this product.
              </p>
            </div>
            <div class="p-4">
              <Form @submit="handleSubmit($event)" :initial-values="user" class="space-y-4">
                <Field name="name" label="Display name" />

                <div class="space-y-1.5">
                  <Label for="profile-email">Email</Label>
                  <Input id="profile-email" type="email" :model-value="user.email" disabled />
                  <p class="text-xs text-secondary-foreground">Email cannot be changed.</p>
                </div>

                <div class="flex items-center gap-2 border-t border-border pt-4">
                  <Button type="submit" size="sm" :disabled="isSaving">
                    <Loader2 v-if="isSaving" class="mr-1.5 size-3.5 animate-spin" />
                    {{ isSaving ? "Saving…" : "Save changes" }}
                  </Button>
                </div>
              </Form>
            </div>
          </section>

          <!-- Appearance -->
          <section class="mt-4 rounded-lg border border-border bg-card shadow-sm">
            <div class="border-b border-border px-4 py-3">
              <h2 class="text-sm font-medium">Appearance</h2>
              <p class="mt-1 text-xs text-secondary-foreground">Choose light, dark, or match your system.</p>
            </div>
            <div class="p-4">
              <ThemePicker variant="segmented" />
            </div>
          </section>

          <!-- Password -->
          <section class="mt-4 rounded-lg border border-border bg-card shadow-sm">
            <div class="border-b border-border px-4 py-3">
              <h2 class="text-sm font-medium">Password</h2>
              <p class="mt-1 text-xs text-secondary-foreground">
                Update the password you use to sign in. Must be at least 6 characters.
              </p>
            </div>
            <div class="space-y-4 p-4">
              <div class="space-y-1.5">
                <Label for="profile-current-password">Current password</Label>
                <Input
                  id="profile-current-password"
                  v-model="passwordFormData.currentPassword"
                  type="password"
                  autocomplete="current-password"
                  placeholder="Enter current password"
                  :disabled="isChangingPassword"
                />
              </div>

              <div class="space-y-1.5">
                <Label for="profile-new-password">New password</Label>
                <Input
                  id="profile-new-password"
                  v-model="passwordFormData.newPassword"
                  type="password"
                  autocomplete="new-password"
                  placeholder="Enter new password"
                  :disabled="isChangingPassword"
                />
              </div>

              <div class="space-y-1.5">
                <Label for="profile-confirm-password">Confirm new password</Label>
                <Input
                  id="profile-confirm-password"
                  v-model="passwordFormData.confirmPassword"
                  type="password"
                  autocomplete="new-password"
                  placeholder="Confirm new password"
                  :disabled="isChangingPassword"
                  @keyup.enter="handlePasswordChange"
                />
              </div>

              <div
                v-if="passwordError"
                class="rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {{ passwordError }}
              </div>

              <div class="flex items-center gap-2 border-t border-border pt-4">
                <Button type="button" size="sm" :disabled="isChangingPassword" @click="handlePasswordChange">
                  <Loader2 v-if="isChangingPassword" class="mr-1.5 size-3.5 animate-spin" />
                  {{ isChangingPassword ? "Updating…" : "Update password" }}
                </Button>
              </div>
            </div>
          </section>

          <!-- Danger zone -->
          <section class="mt-4 rounded-lg border border-destructive/25 bg-card shadow-sm">
            <div class="border-b border-destructive/20 px-4 py-3">
              <h2 class="text-sm font-medium text-destructive">Danger zone</h2>
              <p class="mt-1 text-xs text-secondary-foreground">
                Delete your account. Messages and issues you created stay attributed to “Deleted user”.
                Transfer ownership of every workspace you own first.
              </p>
            </div>
            <div class="space-y-3 p-4">
              <div v-if="isLoadingOwned" class="flex items-center gap-2 text-sm text-secondary-foreground">
                <Loader2 class="size-4 animate-spin" />
                Checking owned workspaces…
              </div>

              <div
                v-else-if="ownedWorkspaces.length > 0"
                class="rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm"
                role="status"
              >
                <p class="text-destructive font-medium">Transfer ownership before deleting</p>
                <ul class="mt-2 ml-2 space-y-1.5">
                  <li v-for="ws in ownedWorkspaces" :key="ws.id">
                    <RouterLink :to="`/${ws.id}/settings/workspace`" class="opacity-90 hover:opacity-100">
                      <span>{{ ws.name }}</span>
                    </RouterLink>
                  </li>
                </ul>
              </div>

              <Button
                type="button"
                variant="flat"
                intent="destructive"
                size="sm"
                :disabled="isLoadingOwned || ownedWorkspaces.length > 0"
                @click="deleteOpen = true"
              >
                Delete account
              </Button>
            </div>
          </section>
        </template>
      </div>
    </ScrollArea>

    <Dialog :open="deleteOpen" @update:open="deleteOpen = $event">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete account</DialogTitle>
        </DialogHeader>
        <p class="text-sm text-secondary-foreground">
          This permanently removes your access, memberships, and sign-in credentials. Content you created
          remains as “Deleted user”.
        </p>
        <p v-if="deleteError" class="mt-3 text-sm text-destructive">{{ deleteError }}</p>
        <DialogFooter class="mt-2">
          <Button type="button" variant="outline" :disabled="isDeletingAccount" @click="deleteOpen = false">
            Cancel
          </Button>
          <Button
            type="button"
            variant="flat"
            intent="destructive"
            :disabled="isDeletingAccount"
            @click="confirmDeleteAccount"
          >
            <Loader2 v-if="isDeletingAccount" class="mr-1.5 size-3.5 animate-spin" />
            {{ isDeletingAccount ? "Deleting…" : "Delete account" }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

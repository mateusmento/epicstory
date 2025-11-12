<script lang="ts" setup>
import { useDependency } from "@/core/dependency-injection";
import { Button } from "@/design-system";
import { Axios, AxiosError } from "axios";
import { ref } from "vue";
import { useRouter } from "vue-router";

const props = defineProps<{
  inviteId: number;
}>();

const router = useRouter();
const axios = useDependency(Axios);

const isLoading = ref(false);
const error = ref<string | null>(null);
const isSuccess = ref(false);

async function acceptInvite() {
  isLoading.value = true;
  error.value = null;

  try {
    await axios.put(`/workspace-member-invites/${props.inviteId}/accepted`);
    isSuccess.value = true;

    // Redirect after a short delay to show success message
    setTimeout(() => {
      router.push("/");
    }, 2000);
  } catch (err) {
    if (err instanceof AxiosError) {
      const message = err.response?.data?.message || err.message || "Failed to accept invitation";
      error.value = message;
    } else {
      error.value = "An unexpected error occurred";
    }
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <main class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
    <div class="w-full max-w-md">
      <div class="bg-white rounded-lg shadow-xl p-8 space-y-6">
        <!-- Header -->
        <div class="text-center space-y-2">
          <div
            class="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4"
          >
            <svg
              v-if="!isSuccess"
              class="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <svg v-else class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900">
            {{ isSuccess ? "Invitation Accepted!" : "Workspace Invitation" }}
          </h1>
          <p class="text-gray-600">
            {{
              isSuccess
                ? "You've successfully joined the workspace. Redirecting you now..."
                : "You've been invited to join a workspace on Epicstory"
            }}
          </p>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <svg
            class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div class="flex-1">
            <p class="text-sm font-medium text-red-800">Error</p>
            <p class="text-sm text-red-700 mt-1">{{ error }}</p>
          </div>
        </div>

        <!-- Success Message -->
        <div
          v-if="isSuccess"
          class="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3"
        >
          <svg
            class="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div class="flex-1">
            <p class="text-sm font-medium text-green-800">Success!</p>
            <p class="text-sm text-green-700 mt-1">
              You're now a member of the workspace. You'll be redirected to the dashboard shortly.
            </p>
          </div>
        </div>

        <!-- Action Button -->
        <div v-if="!isSuccess" class="space-y-4">
          <Button
            @click="acceptInvite"
            :disabled="isLoading"
            class="w-full"
            legacy
            legacy-variant="primary"
            legacy-size="lg"
          >
            <span v-if="!isLoading" class="flex items-center justify-center space-x-2">
              <span>Accept Invitation</span>
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </span>
            <span v-else class="flex items-center justify-center space-x-2">
              <svg
                class="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Accepting...</span>
            </span>
          </Button>

          <p class="text-xs text-gray-500 text-center">
            By accepting, you'll be added to the workspace and gain access to its projects and teams.
          </p>
        </div>
      </div>
    </div>
  </main>
</template>

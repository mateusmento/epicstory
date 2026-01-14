<script lang="ts" setup>
import { Button } from "@/design-system";
import { useUser } from "@/domain/user";
import { useDropZone } from "@vueuse/core";
import { ref, watch } from "vue";

const { user, updateUserPicture } = useUser();

const fileDrop = ref<HTMLElement>();
const pictureFile = ref<File>();
const pictureUrl = ref<string>(user.value?.picture ?? "");
const isUploading = ref(false);
const uploadSuccess = ref(false);
const hasChanges = ref(false);

// Watch for user picture changes
watch(
  () => user.value?.picture,
  (newPicture) => {
    if (newPicture && !pictureFile.value) {
      pictureUrl.value = newPicture;
    }
  }
);

function setPicture(file: File | null) {
  if (!file) return;
  
  // Validate file type
  if (!file.type.startsWith("image/")) {
    alert("Please select an image file");
    return;
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert("Image size must be less than 5MB");
    return;
  }

  pictureFile.value = file;
  hasChanges.value = true;
  uploadSuccess.value = false;

  const reader = new FileReader();
  reader.addEventListener("load", (event) => {
    pictureUrl.value = (event.target?.result as string | null) ?? "";
  });
  reader.addEventListener("error", (err) => {
    console.error("Error reading file:", err);
    alert("Error reading image file");
  });
  reader.readAsDataURL(file);
}

const newPictureIsOver = ref(false);

useDropZone(fileDrop, {
  onEnter() {
    newPictureIsOver.value = true;
  },
  onLeave() {
    newPictureIsOver.value = false;
  },
  onDrop(files) {
    newPictureIsOver.value = false;
    if (files && files.length > 0) {
      setPicture(files[0]);
    }
  },
});

async function onSave() {
  if (!pictureFile.value) return;
  
  isUploading.value = true;
  uploadSuccess.value = false;
  
  try {
  const formData = new FormData();
  formData.set("picture", pictureFile.value);
    await updateUserPicture(formData);
    
    pictureFile.value = undefined;
    hasChanges.value = false;
    uploadSuccess.value = true;
    
    setTimeout(() => {
      uploadSuccess.value = false;
    }, 3000);
  } catch (error) {
    console.error("Error uploading picture:", error);
    alert("Failed to upload picture. Please try again.");
  } finally {
    isUploading.value = false;
  }
}

function onCancel() {
  pictureFile.value = undefined;
  pictureUrl.value = user.value?.picture ?? "";
  hasChanges.value = false;
  uploadSuccess.value = false;
}
</script>

<template>
  <div class="flex flex-col sm:flex-row items-start sm:items-center gap-6">
    <!-- Profile Picture Display -->
    <div class="relative">
      <label
        ref="fileDrop"
        class="block cursor-pointer group relative"
        :class="{ 'pointer-events-none': isUploading }"
      >
        <div
          v-if="!newPictureIsOver && pictureUrl"
          class="relative w-32 h-32 rounded-full overflow-hidden border-4 border-border shadow-lg transition-all group-hover:shadow-xl group-hover:scale-105"
        >
          <img :src="pictureUrl" :alt="user?.name || 'Profile'" class="w-full h-full object-cover" />
          <div
            class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center"
          >
            <span class="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              Change
            </span>
          </div>
        </div>
        <div
        v-else
          class="dropzone flex flex-col items-center justify-center w-32 h-32 text-sm text-center rounded-full border-2 border-dashed transition-colors"
          :class="
            newPictureIsOver
              ? 'border-primary bg-primary/5'
              : 'border-border bg-muted/50 hover:bg-muted'
          "
      >
          <svg
            class="w-8 h-8 mb-2 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span class="text-xs text-muted-foreground">Drop image</span>
        </div>
        <input
          type="file"
          accept="image/*"
          hidden
          @change="setPicture((($event.target as any).files ?? [])[0] || null)"
        />
      </label>
      
      <!-- Upload indicator -->
      <div
        v-if="isUploading"
        class="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center"
      >
        <div class="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex flex-col gap-3">
      <div class="flex flex-col sm:flex-row gap-2">
        <Button
          v-if="hasChanges"
          size="sm"
          @click="onSave"
          :disabled="isUploading"
        >
          {{ isUploading ? "Uploading..." : "Save Picture" }}
        </Button>
        <Button
          v-if="hasChanges"
          size="sm"
          variant="outline"
          @click="onCancel"
          :disabled="isUploading"
        >
          Cancel
        </Button>
      </div>
      
      <p class="text-xs text-muted-foreground">
        JPG, PNG or GIF. Max size 5MB.
      </p>
      
      <span
        v-if="uploadSuccess"
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
        Picture updated successfully
      </span>
    </div>
  </div>
</template>

<style scoped>
.dropzone {
  transition: all 0.2s ease;
}
</style>

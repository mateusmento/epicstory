<script lang="ts" setup>
import { Button } from "@/design-system";
import { useUser } from "@/domain/user";
import { useDropZone } from "@vueuse/core";
import { Loader2 } from "lucide-vue-next";
import { ref, watch } from "vue";
import { toast } from "vue-sonner";

const { user, updateUserPicture } = useUser();

const fileDrop = ref<HTMLElement>();
const pictureFile = ref<File>();
const pictureUrl = ref<string>(user.value?.picture ?? "");
const isUploading = ref(false);
const hasChanges = ref(false);

watch(
  () => user.value?.picture,
  (newPicture) => {
    if (newPicture && !pictureFile.value) {
      pictureUrl.value = newPicture;
    }
  },
);

function setPicture(file: File | null) {
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    toast.error("Please select an image file");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    toast.error("Image size must be less than 5MB");
    return;
  }

  pictureFile.value = file;
  hasChanges.value = true;

  const reader = new FileReader();
  reader.addEventListener("load", (event) => {
    pictureUrl.value = (event.target?.result as string | null) ?? "";
  });
  reader.addEventListener("error", (err) => {
    console.error("Error reading file:", err);
    toast.error("Error reading image file");
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

  try {
    const formData = new FormData();
    formData.set("picture", pictureFile.value);
    await updateUserPicture(formData);

    pictureFile.value = undefined;
    hasChanges.value = false;
    toast.success("Photo updated");
  } catch (error) {
    console.error("Error uploading picture:", error);
    toast.error("Failed to upload picture. Please try again.");
  } finally {
    isUploading.value = false;
  }
}

function onCancel() {
  pictureFile.value = undefined;
  pictureUrl.value = user.value?.picture ?? "";
  hasChanges.value = false;
}
</script>

<template>
  <div class="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
    <div class="relative shrink-0">
      <label
        ref="fileDrop"
        class="group relative block cursor-pointer"
        :class="{ 'pointer-events-none': isUploading }"
      >
        <div
          v-if="!newPictureIsOver && pictureUrl"
          class="relative size-24 overflow-hidden rounded-full border border-border shadow-sm transition-opacity group-hover:opacity-90"
        >
          <img :src="pictureUrl" :alt="user?.name || 'Profile'" class="size-full object-cover" />
          <div
            class="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/25"
          >
            <span class="text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
              Change
            </span>
          </div>
        </div>
        <div
          v-else
          class="flex size-24 flex-col items-center justify-center rounded-full border-2 border-dashed text-center text-sm transition-colors"
          :class="
            newPictureIsOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/40 hover:bg-muted/60'
          "
        >
          <span class="text-xs text-secondary-foreground">Drop image</span>
        </div>
        <input
          type="file"
          accept="image/*"
          hidden
          @change="setPicture((($event.target as HTMLInputElement).files ?? [])[0] || null)"
        />
      </label>

      <div
        v-if="isUploading"
        class="absolute inset-0 flex items-center justify-center rounded-full bg-black/45"
      >
        <Loader2 class="size-5 animate-spin text-white" />
      </div>
    </div>

    <div class="flex min-w-0 flex-col gap-2">
      <div v-if="hasChanges" class="flex flex-wrap gap-2">
        <Button size="sm" :disabled="isUploading" @click="onSave">
          <Loader2 v-if="isUploading" class="mr-1.5 size-3.5 animate-spin" />
          {{ isUploading ? "Uploading…" : "Save photo" }}
        </Button>
        <Button size="sm" variant="outline" :disabled="isUploading" @click="onCancel">Cancel</Button>
      </div>
      <p class="text-xs text-secondary-foreground">JPG, PNG, or GIF. Max 5MB. Click or drop to change.</p>
    </div>
  </div>
</template>

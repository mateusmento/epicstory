<script lang="ts" setup>
import { Button } from "@/design-system";
import { useAuth } from "@/domain/auth";
import { useUser } from "@/domain/user";
import { useDropZone } from "@vueuse/core";
import { ref } from "vue";

const { user, updateUserPicture } = useUser();
const { signOut } = useAuth();

const fileDrop = ref<HTMLElement>();
const pictureFile = ref<File>();
const pictureUrl = ref<string>(user.value?.picture ?? "");

function setPicture(file: File) {
  pictureFile.value = file;

  const reader = new FileReader();
  reader.addEventListener("load", (event) => {
    pictureUrl.value = (event.target?.result as string | null) ?? "";
  });
  reader.readAsDataURL(file);
}

useDropZone(fileDrop, {
  onDrop(files) {
    setPicture((files ?? [])[0]);
  },
});

function onSave() {
  if (!pictureFile.value) return;
  const formData = new FormData();
  formData.set("picture", pictureFile.value);
  updateUserPicture(formData);
}
</script>

<template>
  <div class="flex:rows-lg">
    <label ref="fileDrop" class="self-center">
      <img :src="pictureUrl" class="rounded-full" />
      <input type="file" hidden @change="setPicture((($event.target as any).files ?? [])[0])" />
    </label>
    <Button size="xs" @click="onSave">Save</Button>
    <Button @click="signOut">Sign out</Button>
  </div>
</template>

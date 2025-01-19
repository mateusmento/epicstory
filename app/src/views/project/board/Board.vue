<script lang="ts" setup>
import { useDragAndDrop } from "@formkit/drag-and-drop/vue";

defineProps<{ projectId: string }>();

const [list1Ref, list1] = useDragAndDrop(["hello", "world"], {
  group: "items",
  onTransfer({ sourceParent, targetParent, targetIndex }) {
    if (targetParent.el === list1Ref.value) {
      console.log({
        source: sourceParent.el.id,
        target: targetParent.el.id,
        value: list1.value[targetIndex],
      });
    }
  },
});

const [list2Ref, list2] = useDragAndDrop(["Welcome", "everyone"], {
  group: "items",
  onTransfer({ sourceParent, targetParent, targetIndex }) {
    if (targetParent.el === list2Ref.value) {
      console.log({
        source: sourceParent.el.id,
        target: targetParent.el.id,
        value: list2.value[targetIndex],
      });
    }
  },
});
</script>

<template>
  <div class="flex:row-2xl p-2">
    <div class="flex:col-lg">
      <div class="self-center">List 1</div>
      <div id="list1" class="flex:col-lg w-64 h-full p-2 border rounded-sm" ref="list1Ref">
        <div
          v-for="item of list1"
          :key="item"
          class="flex flex:center w-full h-40 border rounded-sm bg-white"
        >
          {{ item }}
        </div>
      </div>
    </div>
    <div class="flex:col-lg">
      <div class="self-center">List 2</div>
      <div id="list2" class="flex:col-lg w-64 h-full p-2 border rounded-sm" ref="list2Ref">
        <div
          v-for="item of list2"
          :key="item"
          class="flex flex:center w-full h-40 border rounded-sm bg-white"
        >
          {{ item }}
        </div>
      </div>
    </div>
  </div>
</template>

import { useDependency } from "@/core/dependency-injection";
import { defineStore, storeToRefs } from "pinia";
import { computed, ref } from "vue";
import { LabelApi, type CreateLabelData, type UpdateLabelData } from "../api";
import type { Label } from "../types";
import { useWorkspace } from "@/domain/workspace";
import { sortBy } from "lodash";

const useLabelStore = defineStore("labels", () => {
  const labels = ref<Label[]>([]);
  return { labels };
});

export function useLabels() {
  const store = useLabelStore();
  const api = useDependency(LabelApi);

  const { workspaceId } = useWorkspace();

  const labelsById = computed(() => {
    const map = new Map<number, Label>();
    for (const l of store.labels) map.set(l.id, l);
    return map;
  });

  async function fetchLabels() {
    store.labels = await api.fetchLabels(workspaceId.value);
    return store.labels;
  }

  async function createLabel(data: CreateLabelData) {
    const created = await api.createLabel(workspaceId.value, data);
    store.labels = sortBy([...store.labels, created], "name");
    return created;
  }

  async function updateLabel(labelId: number, data: UpdateLabelData) {
    const updated = await api.updateLabel(workspaceId.value, labelId, data);
    const index = store.labels.findIndex((l) => l.id === labelId);
    if (index >= 0) store.labels[index] = updated;
    return updated;
  }

  return {
    ...storeToRefs(store),
    labelsById,
    fetchLabels,
    createLabel,
    updateLabel,
  };
}

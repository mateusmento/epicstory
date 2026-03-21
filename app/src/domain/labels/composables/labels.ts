import { useDependency } from "@/core/dependency-injection";
import { defineStore, storeToRefs } from "pinia";
import { computed, ref } from "vue";
import { LabelApi, type CreateLabelData, type UpdateLabelData } from "../api";
import type { Label } from "../types";

const useLabelStore = defineStore("labels", () => {
  const labels = ref<Label[]>([]);
  const workspaceId = ref<number | null>(null);
  return { labels, workspaceId };
});

export function useLabels() {
  const store = useLabelStore();
  const api = useDependency(LabelApi);

  const labelsById = computed(() => {
    const map = new Map<number, Label>();
    for (const l of store.labels) map.set(l.id, l);
    return map;
  });

  async function fetchLabels(workspaceId: number) {
    // Avoid refetching if we already have labels for the same workspace.
    if (store.workspaceId === workspaceId && store.labels.length > 0) return store.labels;
    store.workspaceId = workspaceId;
    store.labels = await api.fetchLabels(workspaceId);
    return store.labels;
  }

  async function createLabel(workspaceId: number, data: CreateLabelData) {
    const created = await api.createLabel(workspaceId, data);
    // keep sorted by name
    store.labels = [...store.labels, created].sort((a, b) => a.name.localeCompare(b.name));
    store.workspaceId = workspaceId;
    return created;
  }

  async function updateLabel(workspaceId: number, labelId: number, data: UpdateLabelData) {
    const updated = await api.updateLabel(workspaceId, labelId, data);
    store.labels = store.labels.map((l) => (l.id === labelId ? updated : l));
    store.workspaceId = workspaceId;
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

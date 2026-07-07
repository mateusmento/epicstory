import { useDependency } from "@/core/dependency-injection";
import { useWorkspace } from "@/domain/workspace";
import { LabelApi } from "@epicstory/api-client";
import type { CreateLabelData, ILabel, UpdateLabelData } from "@epicstory/contracts";
import { sortBy } from "lodash";
import { defineStore, storeToRefs } from "pinia";
import { computed, ref, watch } from "vue";

const useLabelStore = defineStore("labels", () => {
  const labels = ref<ILabel[]>([]);
  const loadedWorkspaceId = ref<number | null>(null);
  return { labels, loadedWorkspaceId };
});

let labelsInFlight: Promise<ILabel[]> | null = null;
let labelsInFlightWorkspaceId: number | null = null;

export function useLabels() {
  const store = useLabelStore();
  const api = useDependency(LabelApi);

  const { workspaceId } = useWorkspace();

  watch(workspaceId, () => {
    store.labels = [];
    store.loadedWorkspaceId = null;
    labelsInFlight = null;
    labelsInFlightWorkspaceId = null;
  });

  const labelsById = computed(() => {
    const map = new Map<number, ILabel>();
    for (const l of store.labels) map.set(l.id, l);
    return map;
  });

  async function ensureLabelsLoaded(wsId = workspaceId.value) {
    if (store.loadedWorkspaceId === wsId && store.labels.length > 0) {
      return store.labels;
    }

    if (labelsInFlight && labelsInFlightWorkspaceId === wsId) {
      return labelsInFlight;
    }

    labelsInFlightWorkspaceId = wsId;
    labelsInFlight = api.fetchLabels(wsId).then((fetched) => {
      store.labels = fetched;
      store.loadedWorkspaceId = wsId;
      labelsInFlight = null;
      labelsInFlightWorkspaceId = null;
      return fetched;
    });

    return labelsInFlight;
  }

  /** @deprecated Prefer ensureLabelsLoaded — kept for callers that force a refresh */
  async function fetchLabels() {
    store.loadedWorkspaceId = null;
    return ensureLabelsLoaded();
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
    ensureLabelsLoaded,
    fetchLabels,
    createLabel,
    updateLabel,
  };
}

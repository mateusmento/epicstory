import { useLabels } from "@/domain/labels";
import { useRecentProjects, useWorkspace } from "@/domain/workspace";
import { computed, type MaybeRefOrGetter, toValue, watch } from "vue";
import { useProjectContext } from "./project-context";

const RECENT_TAB_LIMIT = 5;

export function useProjectScreen(projectId: MaybeRefOrGetter<number>) {
  const { workspaceId } = useWorkspace();
  const { ensureProjectContext, projectFor } = useProjectContext();
  const { ensureLabelsLoaded } = useLabels();
  const { fetchRecentProjects } = useRecentProjects();

  const project = projectFor(projectId);
  const teamId = computed(() => project.value?.teamId);

  watch(
    () => toValue(projectId),
    (id) => {
      Promise.all([
        ensureProjectContext(id),
        ensureLabelsLoaded(),
        fetchRecentProjects(workspaceId.value, RECENT_TAB_LIMIT),
      ]).catch(() => {});
    },
    { immediate: true },
  );

  return { project, teamId, ensureProjectContext };
}

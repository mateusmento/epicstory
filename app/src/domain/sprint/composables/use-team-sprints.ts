import { burndownProgress, sprintDateLabel, successPercent } from "@/lib/sprint";
import { useTeam } from "@/domain/team";
import type { CompleteSprintResult, ISprint } from "@epicstory/contracts";
import { computed, onMounted, ref } from "vue";
import { useSprint } from "./sprint";

export type TeamSprintsProps = { workspaceId: string; teamId: string };

export function useTeamSprints(props: TeamSprintsProps) {
  const { team, fetchTeam } = useTeam();
  const { sprints, fetchSprints } = useSprint();

  const reviewSprintId = ref<number | null>(null);
  const reviewDrawerOpen = ref(false);

  const activeSprint = computed(() => sprints.value.find((s) => s.status === "active") ?? null);
  const completedSprints = computed(() => sprints.value.filter((s) => s.status === "completed"));

  onMounted(async () => {
    await fetchTeam(+props.teamId);
    await fetchSprints(+props.teamId);

    const params = new URLSearchParams(window.location.search);
    const reviewId = params.get("reviewSprint");
    if (reviewId) {
      reviewSprintId.value = +reviewId;
      reviewDrawerOpen.value = true;
    }
  });

  function openReview(sprint: ISprint) {
    reviewSprintId.value = sprint.id;
    reviewDrawerOpen.value = true;
  }

  function closeReview() {
    reviewDrawerOpen.value = false;
  }

  function onSprintCompleted(result: CompleteSprintResult) {
    fetchSprints(+props.teamId);
    openReview(result.sprint);
  }

  return {
    team,
    sprints,
    activeSprint,
    completedSprints,
    reviewSprintId,
    reviewDrawerOpen,
    openReview,
    closeReview,
    onSprintCompleted,
    sprintDateLabel,
    burndownProgress,
    successPercent,
  };
}

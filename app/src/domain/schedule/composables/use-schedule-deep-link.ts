import { watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { SCHEDULE_CHANNEL_ID_QUERY_KEY } from "../constants";
import type { CalendarItemDialogController } from "./use-calendar-item-dialog";
import { omit } from "lodash";

export function useScheduleDeepLink(
  dialog: Pick<CalendarItemDialogController, "openCreateMeetingWithChannel">,
) {
  const route = useRoute();
  const router = useRouter();

  function consumeScheduleChannelIdQuery() {
    const scheduleCid = route.query[SCHEDULE_CHANNEL_ID_QUERY_KEY];
    if (scheduleCid == null || scheduleCid === "") return;

    const raw = Array.isArray(scheduleCid) ? scheduleCid[0] : scheduleCid;
    const id = Number(raw);
    if (!Number.isNaN(id)) {
      dialog.openCreateMeetingWithChannel(id);
    }

    const query = omit(route.query, SCHEDULE_CHANNEL_ID_QUERY_KEY);
    router.replace({ path: route.path, query });
  }

  watch(
    () => route.query[SCHEDULE_CHANNEL_ID_QUERY_KEY],
    (scheduleChannelId) => {
      if (scheduleChannelId == null || scheduleChannelId === "") return;
      consumeScheduleChannelIdQuery();
    },
    { immediate: true },
  );
}

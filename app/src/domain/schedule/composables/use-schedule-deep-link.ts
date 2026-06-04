import { onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { CalendarItemDialogController } from "./use-calendar-item-dialog";

export function useScheduleDeepLink(
  dialog: Pick<CalendarItemDialogController, "openCreateMeetingWithChannel">,
) {
  const route = useRoute();
  const router = useRouter();

  onMounted(() => {
    const scheduleCid = route.query.scheduleChannelId;
    if (scheduleCid == null || scheduleCid === "") return;

    const raw = Array.isArray(scheduleCid) ? scheduleCid[0] : scheduleCid;
    const id = Number(raw);
    if (!Number.isNaN(id)) {
      dialog.openCreateMeetingWithChannel(id);
    }
    const { scheduleChannelId: _sc, ...restQuery } = route.query;
    router.replace({ path: route.path, query: restQuery });
  });
}

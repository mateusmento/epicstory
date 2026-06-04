import { useRouteQueryRef } from "@/composables";
import { computed, ref, type Ref } from "vue";
import { SCHEDULE_DEFAULT_VIEW, SCHEDULE_VIEW_QUERY_KEY, type ScheduleViewType } from "../constants";
import { formatScheduleHeader, shiftScheduleDate, todayInLocalTz } from "../schedule-date";
import { isValidScheduleViewQuery, parseScheduleViewQuery } from "../schedule-view-query";

export function useScheduleNavigation() {
  const currentDate = ref<Date>(todayInLocalTz());

  const currentView = useRouteQueryRef<ScheduleViewType>({
    key: SCHEDULE_VIEW_QUERY_KEY,
    defaultValue: SCHEDULE_DEFAULT_VIEW,
    parse: parseScheduleViewQuery,
    isValid: isValidScheduleViewQuery,
  });

  const headerLabel = computed(() => formatScheduleHeader(currentView.value, currentDate.value));

  function goToToday() {
    currentDate.value = todayInLocalTz();
  }

  function goToPrevious() {
    currentDate.value = shiftScheduleDate(currentView.value, currentDate.value, -1);
  }

  function goToNext() {
    currentDate.value = shiftScheduleDate(currentView.value, currentDate.value, 1);
  }

  return {
    currentView,
    currentDate,
    headerLabel,
    goToToday,
    goToPrevious,
    goToNext,
  };
}

export type ScheduleNavigation = ReturnType<typeof useScheduleNavigation>;

export type ScheduleNavigationRefs = {
  currentView: Ref<ScheduleViewType>;
  currentDate: Ref<Date>;
};

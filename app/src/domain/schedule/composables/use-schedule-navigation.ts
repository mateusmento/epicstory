import { useRouteQueryRef } from "@/core/composables";
import { computed, ref, type Ref } from "vue";
import {
  formatScheduleHeader,
  SCHEDULE_DEFAULT_VIEW,
  SCHEDULE_VIEW_QUERY_KEY,
  shiftScheduleDate,
  todayInLocalTz,
  type ScheduleViewType,
} from "@/lib/schedule";
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

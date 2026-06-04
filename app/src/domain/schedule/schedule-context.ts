import type { InjectionKey } from "vue";
import type { CalendarItemDialogController } from "./composables/use-calendar-item-dialog";

export const SCHEDULE_DIALOG_KEY: InjectionKey<CalendarItemDialogController> = Symbol("schedule-dialog");

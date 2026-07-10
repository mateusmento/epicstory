import { describe, expect, it } from "vitest";
import {
  addMinutesToTime,
  durationMinutesBetween,
  formatDurationLabel,
  formatTimeDisplay,
  isDurationPreset,
  timeSlotsIncluding,
  TIME_SLOTS,
} from "./time-slots";

describe("time-slots", () => {
  it("builds 96 fifteen-minute slots", () => {
    expect(TIME_SLOTS).toHaveLength(96);
    expect(TIME_SLOTS[0]).toBe("00:00");
    expect(TIME_SLOTS[4]).toBe("01:00");
    expect(TIME_SLOTS[95]).toBe("23:45");
  });

  it("adds duration to a start time", () => {
    expect(addMinutesToTime("09:00", 60)).toBe("10:00");
    expect(addMinutesToTime("09:15", 45)).toBe("10:00");
  });

  it("computes same-day duration", () => {
    expect(durationMinutesBetween("09:00", "10:00")).toBe(60);
    expect(durationMinutesBetween("10:00", "09:00")).toBeNull();
  });

  it("recognizes duration presets", () => {
    expect(isDurationPreset(60)).toBe(true);
    expect(isDurationPreset(25)).toBe(false);
    expect(formatDurationLabel(90)).toBe("1.5h");
  });

  it("formats display times without leading zero hours", () => {
    expect(formatTimeDisplay("09:00")).toBe("9:00");
    expect(formatTimeDisplay("00:15")).toBe("0:15");
  });

  it("includes odd selected times in the slot list", () => {
    const slots = timeSlotsIncluding("09:07");
    expect(slots).toContain("09:07");
    expect(slots.indexOf("09:00")).toBeLessThan(slots.indexOf("09:07"));
    expect(slots.indexOf("09:07")).toBeLessThan(slots.indexOf("09:15"));
  });
});

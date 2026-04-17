import { common, createLowlight } from "lowlight";

/** Shared lowlight instance for TipTap code blocks (channel + issue editors). */
export const epicStoryLowlight = createLowlight(common);

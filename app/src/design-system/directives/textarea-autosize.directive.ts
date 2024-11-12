import type { Directive } from "vue";

export const vTextareaAutosize: Directive = {
  mounted(textarea: HTMLTextAreaElement) {
    textarea.addEventListener("input", () => resize(textarea));
    resize(textarea);
  },
};

function resize(textarea: HTMLTextAreaElement) {
  if (!textarea) return;
  const text = textarea.value;
  const cols = calcTextAreaCols(textarea) || 1;

  const lines = text.split("\n").map((l) => Math.ceil(l.length / cols) || 1);
  const linesCount = lines.reduce((a, b) => a + b);

  const minRows = textarea.getAttribute("min-rows") ?? 1;
  const maxRows = textarea.getAttribute("max-rows") ?? Number.POSITIVE_INFINITY;
  textarea.rows = Math.min(Math.max(linesCount, +minRows), +maxRows);
}

function calcTextAreaCols(element: HTMLTextAreaElement) {
  if (!element) return 0;

  const style = window.getComputedStyle(element, null);
  const fontSize = style.getPropertyValue("font-size");
  const font = style.getPropertyValue("font-family");
  // prepare environment to figure out row maximum; from: https://stackoverflow.com/a/21015393
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return 0;
  context.font = fontSize + " " + font;

  // <textarea> offsetWidth, minus border and padding
  let rawWidth = element.offsetWidth;
  rawWidth -= parseInt(getComputedStyle(element, null).getPropertyValue("border-left-width"));
  rawWidth -= parseInt(getComputedStyle(element, null).getPropertyValue("border-right-width"));
  rawWidth -= parseInt(getComputedStyle(element, null).getPropertyValue("padding-left"));
  rawWidth -= parseInt(getComputedStyle(element, null).getPropertyValue("padding-right"));

  // <textarea> width, divided by the width of the 'a' character
  const rawMeasure = rawWidth / context.measureText("a").width;

  // round down
  return Math.floor(rawMeasure);
}

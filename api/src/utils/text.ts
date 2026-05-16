import { truncatePlainText } from '@epicstory/tiptap';

export function truncateText(text: string, max = 220): string {
  return truncatePlainText(text, max);
}

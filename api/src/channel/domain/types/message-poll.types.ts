/** Persisted on `messages.poll` (jsonb); votes reference `options[].id`. */
export type MessagePoll = {
  question: string;
  options: { id: string; label: string }[];
};

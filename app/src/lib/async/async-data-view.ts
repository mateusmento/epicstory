/** Single fetch with no pages (attachments, one repo list, etc.). */
export type AsyncDataView<T> = {
  data: T | null;
  loading: boolean;
  error?: string | null;
};

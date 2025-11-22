import { defineStore } from "pinia";
import { computed, inject, provide, reactive } from "vue";

type NavViewContext = {
  content?: string;
  props: any;
  onTrigger?: (content: string) => void;
  onChange?: (content: string) => void;
};

const useNavViewStore = defineStore("nav-view", () => {
  const views = reactive<Record<string, NavViewContext>>({});
  return { views };
});

type NavViewOptions = {
  view: string;
  initialContent?: string;
  onTrigger?: (content: string) => void;
  onChange?: (content: string) => void;
};

export function useNavView({ view, initialContent, onChange, onTrigger }: NavViewOptions) {
  const store = useNavViewStore();

  if (!(view in store.views))
    store.views[view] = {
      content: initialContent,
      props: undefined,
      onChange,
      onTrigger,
    };

  provide("nav-view", store.views[view]);
}

export function useNavViewContent() {
  const navView = inject<NavViewContext>("nav-view");
  if (!navView) throw new Error("NavView is not provided.");
  return navView;
}

export function useNavTrigger(view: string) {
  const store = useNavViewStore();

  function viewContent(value: string, props?: any) {
    const context = store.views[view];
    context.onTrigger?.(value);
    if (value !== context.content) context.onChange?.(value);
    context.content = value;
    if (props) context.props = props;
  }

  const content = computed(() => store.views[view]?.content);
  const props = computed(() => store.views[view]?.props);

  return { content, props, viewContent };
}

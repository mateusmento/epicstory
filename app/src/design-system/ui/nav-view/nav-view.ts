import { defineStore } from "pinia";
import { computed, inject, provide, reactive, type InjectionKey } from "vue";

type NavViewContext = {
  content?: string;
  props: any;
  onTrigger?: (content: string, props: any) => void;
  onChange?: (content: string, props: any) => void;
  onToggle?: (content: string, props: any) => void;
};

const NAV_VIEW_CONTEXT_KEY: InjectionKey<NavViewContext> = Symbol("nav-view-context");

const useNavViewStore = defineStore("nav-view", () => {
  const views = reactive<Record<string, NavViewContext>>({});
  return { views };
});

type NavViewOptions = {
  view: string;
  initialContent?: string;
  onTrigger?: (content: string, props: any) => void;
  onChange?: (content: string, props: any) => void;
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

  provide(NAV_VIEW_CONTEXT_KEY, store.views[view]);
}

export function useNavViewContent() {
  const navView = inject(NAV_VIEW_CONTEXT_KEY);
  if (!navView) throw new Error("NavView is not provided.");
  return navView;
}

export function useNavTrigger(view: string) {
  const store = useNavViewStore();

  function viewContent(value: string, props?: any) {
    const context = store.views[view];
    context.onTrigger?.(value, props);
    if (value !== context.content) context.onChange?.(value, props);
    context.content = value;
    if (props) context.props = props;
  }

  const content = computed(() => store.views[view]?.content);
  const props = computed(() => store.views[view]?.props);

  return { content, props, viewContent };
}

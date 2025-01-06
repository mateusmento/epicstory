import { computed, inject, provide, type Ref, type WritableComputedRef } from "vue";

type NavViewContext = {
  viewContent: WritableComputedRef<string>;
  contentProps: Ref<any>;
};

const views: Record<string, NavViewContext> = {};

type NavViewOptions = {
  view: string;
  content: Ref<string>;
  props: Ref<any>;
  onTrigger?: (content: string) => void;
  onChange?: (content: string) => void;
};

export function useNavView({ view, content, props, onChange, onTrigger }: NavViewOptions) {
  const viewContent = computed({
    get: () => content.value,
    set: (value: string) => {
      onTrigger?.(value);
      if (value !== content.value) onChange?.(value);
      content.value = value;
    },
  });

  views[view] = { viewContent, contentProps: props };

  provide("navView", views[view]);

  return views[view];
}

export function useNavViewContent() {
  const navView = inject<NavViewContext>("navView");
  if (!navView) throw new Error("NavView is not provided.");
  return navView;
}

export function useNavTrigger(view: string) {
  const currentContent = computed({
    get: () => views[view]?.viewContent.value,
    set: (value: string) => {
      try {
        views[view].viewContent.value = value;
      } catch (err) {
        console.log(view);
        throw err;
      }
    },
  });

  const contentProps = computed({
    get: () => views[view]?.contentProps.value,
    set: (value: string) => {
      views[view].contentProps.value = value;
    },
  });

  function viewContent(content: string, props?: any) {
    currentContent.value = content;
    if (props) contentProps.value = props;
  }

  return { currentContent, contentProps, viewContent };
}

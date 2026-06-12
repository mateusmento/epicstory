import { Menu, MenuContent, MenuTrigger } from "@/design-system";
import { cn } from "@/design-system/utils";
import { defineComponent, ref } from "vue";

/**
 * Renders menu-panel children (MenuInput, MenuItem, …) inside an open dropdown,
 * matching how shells like WorkspaceMemberDropdown / IssueLabelsDropdown wrap them.
 */
export const DropdownMenuPanel = defineComponent({
  name: "DropdownMenuPanel",
  props: {
    class: {
      type: String,
      default: "",
    },
    contentClass: {
      type: String,
      default: "w-[360px]",
    },
  },
  setup(props, { slots }) {
    const open = ref(true);

    return () => (
      <div class={cn("inline-flex", props.class)}>
        <Menu
          type="dropdown-menu"
          open={open.value}
          onUpdate:open={(value: boolean) => {
            open.value = value;
          }}
        >
          <MenuTrigger as-child>
            <button type="button" class="sr-only" aria-hidden="true" tabindex={-1}>
              Menu
            </button>
          </MenuTrigger>
          <MenuContent disabled-portal class={props.contentClass}>
            {slots.default?.()}
          </MenuContent>
        </Menu>
      </div>
    );
  },
});

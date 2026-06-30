import { Button } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { IssueKey, IssueLabelTags, IssueStatusDropdown } from "@/presentationals/issue";
import { issueStatusDotClass } from "@/presentationals/issue/status/status-fns";
import { UserAvatarStack } from "@/presentationals/user";
import { DueDatePicker } from "@/presentationals/issue/due-date-picker";
import { PriorityToggler } from "@/presentationals/issue/priority-toggler";
import WorkspaceMemberDropdown from "@/presentationals/workspace-members/WorkspaceMemberDropdown.vue";
import type { HeroIssueHeaderState } from "./hero.fixtures";
import { heroWorkspaceMemberList } from "./hero.fixtures";
import { defineComponent, type PropType } from "vue";

export const IssueHeaderHarness = defineComponent({
  name: "IssueHeaderHarness",
  components: {
    IssueKey,
    IssueStatusDropdown,
    IssueLabelTags,
    UserAvatarStack,
    WorkspaceMemberDropdown,
    PriorityToggler,
    DueDatePicker,
    Button,
    Icon,
  },
  props: {
    state: {
      type: Object as PropType<HeroIssueHeaderState>,
      required: true,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: {
    "update:state": (_value: HeroIssueHeaderState) => true,
  },
  setup(props, { emit }) {
    function patch(partial: Partial<HeroIssueHeaderState>) {
      emit("update:state", { ...props.state, ...partial });
    }

    return {
      patch,
      memberList: heroWorkspaceMemberList,
      issueStatusDotClass,
    };
  },
  template: `
    <div class="mx-auto max-w-md w-full">
      <div class="flex items-center gap-2 text-xs text-secondary-foreground mb-4">
        <span class="font-medium">{{ state.projectName }}</span>
        <span>/</span>
        <IssueKey :issue-key="state.issueKey" copyable size="sm" class="text-foreground/80" />
      </div>

      <div class="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm">
        <div class="text-sm font-medium text-foreground">Details</div>

        <div class="flex flex-col gap-1">
          <div class="text-xs text-secondary-foreground">Status</div>
          <IssueStatusDropdown :value="state.status" @select="patch({ status: $event })">
            <div class="flex items-center gap-2 min-w-0">
              <button
                type="button"
                class="w-2.5 h-2.5 rounded-full ring-1 ring-border"
                :class="issueStatusDotClass(state.status)"
              />
              <span class="text-xs text-muted-foreground capitalize">{{ state.status }}</span>
            </div>
          </IssueStatusDropdown>
        </div>

        <div class="flex flex-col gap-1 min-w-0">
          <div class="text-xs text-secondary-foreground">Assignees</div>
          <WorkspaceMemberDropdown
            :users="state.assignees"
            @update:users="patch({ assignees: $event })"
            :list="memberList"
            selected-label="Assignees"
            search-placeholder="Search assignees…"
            :disabled="disabled"
          >
            <template #default="{ users }">
              <div class="flex min-w-0 w-full items-center cursor-pointer">
                <UserAvatarStack
                  v-if="users.length"
                  :users="users"
                  size="md"
                  :min="1"
                  :overlap-px="4"
                  class="min-w-0 flex-1 basis-32"
                />
                <Button
                  v-else
                  variant="ghost"
                  size="icon"
                  class="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Icon name="fa-user-plus" class="h-4 w-4 shrink-0" />
                </Button>
              </div>
            </template>
          </WorkspaceMemberDropdown>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1 min-w-0">
            <div class="text-xs text-secondary-foreground">Priority</div>
            <PriorityToggler
              :value="state.priority"
              @update:value="patch({ priority: $event })"
            />
          </div>
          <div class="flex flex-col gap-1 min-w-0">
            <div class="text-xs text-secondary-foreground">Due date</div>
            <DueDatePicker
              :model-value="state.dueDate ?? undefined"
              size="icon"
              :disabled="disabled"
              @update:model-value="patch({ dueDate: $event ?? null })"
            />
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <div class="text-xs text-secondary-foreground">Labels</div>
          <IssueLabelTags
            :catalog="state.catalog"
            :model-value="state.labelIds"
            :disabled="disabled"
            @update:model-value="patch({ labelIds: $event })"
          />
        </div>
      </div>
    </div>
  `,
});

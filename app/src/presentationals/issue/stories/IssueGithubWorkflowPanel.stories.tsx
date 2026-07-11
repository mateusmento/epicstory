import type { Meta, StoryObj } from "@storybook/vue3";
import IssueGithubWorkflowPanel from "../IssueGithubWorkflowPanel.vue";
import {
  storyGithubAccess,
  storyGithubAccessNeedsInstall,
  storyGithubAccessNeedsMemberLink,
  storyGithubWorkflowMutation,
} from "./issue-story.fixtures";

const meta = {
  title: "Presentational/Issue/IssueGithubWorkflowPanel",
  component: IssueGithubWorkflowPanel,
  tags: ["autodocs"],
  decorators: [
    () => ({
      template:
        '<div class="w-[520px] p-4 bg-background"><div class="overflow-hidden rounded-lg border border-border bg-muted/20"><div class="px-2 py-1.5 text-xs font-medium">Development</div><story /></div></div>',
    }),
  ],
} satisfies Meta<typeof IssueGithubWorkflowPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {
  render: () => ({
    components: { IssueGithubWorkflowPanel },
    setup() {
      return {
        access: storyGithubAccess,
        mutation: storyGithubWorkflowMutation,
      };
    },
    template: `
      <IssueGithubWorkflowPanel
        :access="access"
        :form-visible="true"
        :mutation="mutation"
      />
    `,
  }),
};

export const NeedsInstall: Story = {
  render: () => ({
    components: { IssueGithubWorkflowPanel },
    setup() {
      return {
        access: storyGithubAccessNeedsInstall,
        mutation: storyGithubWorkflowMutation,
      };
    },
    template: `
      <IssueGithubWorkflowPanel
        :access="access"
        :form-visible="false"
        :mutation="mutation"
      />
    `,
  }),
};

export const NeedsMemberLink: Story = {
  render: () => ({
    components: { IssueGithubWorkflowPanel },
    setup() {
      return {
        access: storyGithubAccessNeedsMemberLink,
        mutation: storyGithubWorkflowMutation,
      };
    },
    template: `
      <IssueGithubWorkflowPanel
        :access="access"
        :form-visible="false"
        :mutation="mutation"
      />
    `,
  }),
};

export const Busy: Story = {
  render: () => ({
    components: { IssueGithubWorkflowPanel },
    setup() {
      return {
        access: storyGithubAccess,
        mutation: {
          ...storyGithubWorkflowMutation,
          busy: true,
          statusMessage: "Opening pull request on GitHub…",
        },
      };
    },
    template: `
      <div class="flex flex-col gap-2">
        <p class="text-xs text-muted-foreground">
          Busy/action errors use toasts — this panel stays empty when setup is ready.
        </p>
        <IssueGithubWorkflowPanel
          :access="access"
          :form-visible="true"
          :mutation="mutation"
        />
      </div>
    `,
  }),
};

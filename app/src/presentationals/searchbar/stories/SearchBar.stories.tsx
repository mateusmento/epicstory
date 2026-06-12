import SearchBar from "../SearchBar.vue";
import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";

const meta = {
  title: "Presentational/Searchbar/SearchBar",
  component: SearchBar,
  tags: ["autodocs"],
  decorators: [
    () => ({
      template: '<div class="w-72 p-4"><story /></div>',
    }),
  ],
} satisfies Meta<typeof SearchBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { SearchBar },
    setup() {
      const query = ref("");
      const focused = ref(false);
      const lastEvent = ref<string | null>(null);
      return {
        query,
        focused,
        lastEvent,
        onFocus: () => {
          lastEvent.value = "focus";
        },
        onBlur: () => {
          lastEvent.value = "blur";
        },
        onClear: () => {
          lastEvent.value = "clear";
        },
      };
    },
    template: `
      <div class="flex flex-col gap-2">
        <SearchBar
          v-model="query"
          v-model:focused="focused"
          placeholder="Search channels & people"
          @focus="onFocus"
          @blur="onBlur"
          @clear="onClear"
        />
        <div class="text-xs text-muted-foreground space-y-0.5">
          <div>Query: "{{ query }}"</div>
          <div>Focused: {{ focused }}</div>
          <div v-if="lastEvent">Last event: {{ lastEvent }}</div>
        </div>
      </div>
    `,
  }),
};

export const Loading: Story = {
  render: () => ({
    components: { SearchBar },
    setup() {
      const query = ref("design");
      const focused = ref(true);
      return { query, focused };
    },
    template: `
      <SearchBar
        v-model="query"
        v-model:focused="focused"
        :loading="true"
        placeholder="Search channels & people"
      />
    `,
  }),
};

export const WithValue: Story = {
  render: () => ({
    components: { SearchBar },
    setup() {
      const query = ref("epic");
      const focused = ref(true);
      return { query, focused };
    },
    template: `
      <SearchBar
        v-model="query"
        v-model:focused="focused"
        placeholder="Search channels & people"
      />
    `,
  }),
};

# Presentational Storybook wiring

> Can a developer browse Storybook and see each presentational component **wired the same way containers and views wire it**?

## Reference-first workflow

1. **Find the reference** — grep `@/presentationals/.../ComponentName` under `containers/` and `views/`.
2. **Copy the contract, not the domain** — same prop names, `v-model`, `@event`, and `#slot` fills. Replace domain composables with **fixture data + local `ref` state**.
3. **Never import `@/containers/*` or `@/domain/*`** in presentational stories — use presentationals + fixtures only. Slot content from containers → presentational sibling wired with fixtures, or `stories/stubs/`.
4. **Interactive events update state** — handlers mutate story-local refs so toggles, pins, and dialogs visibly change.

## Folder layout

```
presentationals/
  stories/                    # shared infra (this folder)
    story-container.tsx
    fixtures/                 # cross-domain view-model fixtures
    stubs/                    # slot stand-ins
    harness/                  # shared wiring helpers
  <domain>/
    SomeComponent.vue
    stories/
      SomeComponent.stories.tsx
      some-component.harness.tsx   # optional: mirrors container template
      some-component.fixtures.ts   # optional: component-specific fixtures
```

- Never colocate `*.stories.*` next to `.vue` files.
- Sidebar title: **`Presentational/<Domain>/<Component>`**.

## Harness naming

- `*.harness.tsx` — `defineComponent` encoding production wiring; keeps `.stories.tsx` thin.
- Shared fixtures in `stories/fixtures/`; component-specific in `<domain>/stories/*.fixtures.ts`.

## Anti-patterns

- Bare `args` on slot-shells with **empty slots**.
- Props omitting required view-model fields the container always supplies.
- Events wired only to `action('event')` with no visible UI feedback.
- Importing containers or domain to “make it work”.

## Precedents

- `app-pane/channel/stories/ChannelMembers.stories.tsx` — `#add-member` slot
- `app-pane/channel/stories/ChannelDetailsPane.stories.tsx` — `#members` filled
- `channel/stories/Chatbox.stories.tsx` — `#timeline` / `#composer`, local state
- `channel/stories/MessageGroup.stories.tsx` — default slot with `MessageBox` children

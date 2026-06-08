<script lang="ts" setup>
import { UserAvatar } from "@/presentationals/user";
import {
  Button,
  Input,
  Menu,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuTrigger,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/design-system";
import { Icon } from "@/design-system/icons";
import { useAuth } from "@/domain/auth";
import { useDependency } from "@/core/dependency-injection";
import { UserApi } from "@epicstory/api-client";
import { useWorkspace } from "@/domain/workspace";
import { DotsHorizontalIcon } from "@radix-icons/vue";
import { format } from "date-fns";
import { debounce } from "lodash";
import { ArrowLeft, Trash2Icon, UserPlus, X } from "lucide-vue-next";
import { computed, onMounted, ref, watch } from "vue";
import type { IUser as IUser } from "@epicstory/contracts";

type PendingInvite = { email: string; user: IUser | null };

const { workspace, members, fetchWorkspaceMembers, sendWorkspaceMemberInvite, removeMember } = useWorkspace();
const { user: authUser } = useAuth();
const userApi = useDependency(UserApi);

onMounted(() => fetchWorkspaceMembers());
watch(workspace, () => fetchWorkspaceMembers());

const inviteOpen = ref(false);
const emailInput = ref("");
const searchHits = ref<IUser[]>([]);
const isSearching = ref(false);
const selectedInvites = ref<PendingInvite[]>([]);
const isSending = ref(false);

const debouncedUserSearch = debounce(async (q: string) => {
  const t = q.trim();
  if (!t) {
    searchHits.value = [];
    isSearching.value = false;
    return;
  }
  isSearching.value = true;
  try {
    const page = await userApi.findUsers(t, { page: 0, count: 8 });
    searchHits.value = page.content;
  } finally {
    isSearching.value = false;
  }
}, 200);

watch(emailInput, (q) => debouncedUserSearch(q));

const primaryMatch = computed(() => {
  if (isSearching.value) return undefined;
  const t = emailInput.value.trim().toLowerCase();
  if (!t) return undefined;
  const exact = searchHits.value.find((u) => u.email.toLowerCase() === t);
  if (exact) return exact;
  return searchHits.value[0] ?? null;
});

const showNotRegisteredHint = computed(() => {
  if (isSearching.value) return false;
  const t = emailInput.value.trim();
  if (t.length < 3) return false;
  if (!t.includes("@")) return false;
  return searchHits.value.length === 0;
});

function emailKey(e: KeyboardEvent) {
  if (e.key !== "Enter") return;
  e.preventDefault();
  const raw = emailInput.value.trim();
  if (!raw) return;
  const t = raw.toLowerCase();
  if (selectedInvites.value.some((i) => i.email.toLowerCase() === t)) {
    return;
  }
  if (authUser.value?.email?.toLowerCase() === t) {
    return;
  }
  if (members.value.some((m) => m.user.email?.toLowerCase() === t)) {
    return;
  }
  const fromHits = searchHits.value.find((u) => u.email.toLowerCase() === t) ?? null;
  selectedInvites.value = [...selectedInvites.value, { email: raw, user: fromHits }];
  emailInput.value = "";
  searchHits.value = [];
}

function removePending(email: string) {
  const e = email.toLowerCase();
  selectedInvites.value = selectedInvites.value.filter((i) => i.email.toLowerCase() !== e);
}

function closeInvite() {
  inviteOpen.value = false;
  emailInput.value = "";
  searchHits.value = [];
  selectedInvites.value = [];
}

async function onSend() {
  if (selectedInvites.value.length === 0 || isSending.value) return;
  isSending.value = true;
  try {
    await sendWorkspaceMemberInvite(
      selectedInvites.value.map((i) => ({
        email: i.email,
        userId: i.user?.id,
      })),
    );
    closeInvite();
    await fetchWorkspaceMembers();
  } finally {
    isSending.value = false;
  }
}
</script>

<template>
  <div v-if="!inviteOpen" class="flex:col w-96">
    <div class="flex:row-auto flex:center-y justify-between px-4 py-2 h-10">
      <h1 class="flex:row-md flex:center-y whitespace-nowrap">
        <Icon name="bi-people-fill" />
        <div class="font-medium text-sm">Workspace Members</div>
      </h1>
      <Tooltip>
        <TooltipTrigger as-child>
          <Button variant="ghost" size="icon" type="button" @click="inviteOpen = true">
            <UserPlus class="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Invite members</TooltipContent>
      </Tooltip>
    </div>

    <Separator />

    <div class="flex:col-md p-2">
      <div
        v-for="member in members"
        :key="member.id"
        class="flex:row-2xl flex:center-y p-2 rounded-lg hover:bg-secondary cursor-pointer"
      >
        <UserAvatar :name="member.user.name" :picture="member.user.picture" size="lg" class="flex-shrink-0" />
        <div class="flex:col">
          <div class="text-sm whitespace-nowrap">
            {{ member.user.name }}
          </div>
          <div class="text-xs text-secondary-foreground whitespace-nowrap">
            Member since {{ format(member.joinedAt, "MMM do, yyyy") }}
          </div>
        </div>
        <div class="flex:col ml-auto">
          <Menu>
            <MenuTrigger as-child>
              <Button variant="ghost" size="icon" class="self-end">
                <DotsHorizontalIcon />
              </Button>
            </MenuTrigger>
            <MenuContent side="bottom" align="end">
              <MenuGroup>
                <MenuItem @click="removeMember(member.id)" variant="destructive">
                  <Trash2Icon class="mr-2 h-4 w-4" />
                  <span class="whitespace-nowrap">Remove from workspace</span>
                </MenuItem>
              </MenuGroup>
            </MenuContent>
          </Menu>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="flex:col w-96 min-h-0 flex-1 p-2 gap-3">
    <div class="flex:row flex:center-y gap-1">
      <Button variant="ghost" size="icon" type="button" @click="closeInvite">
        <ArrowLeft class="h-4 w-4" />
      </Button>
      <div class="text-sm font-medium">Invite to workspace</div>
    </div>

    <div class="flex:col-sm">
      <label class="text-xs text-muted-foreground" for="wm-invite-email">Email</label>
      <Input
        id="wm-invite-email"
        v-model="emailInput"
        type="email"
        autocomplete="email"
        placeholder="name@example.com"
        @keydown="emailKey"
      />
    </div>

    <div v-if="isSearching" class="text-xs text-muted-foreground px-0.5">Searching…</div>
    <div v-else-if="primaryMatch" class="flex:row gap-3 pr-1 py-1 items-center">
      <UserAvatar :name="primaryMatch.name" :picture="primaryMatch.picture" size="md" class="flex-shrink-0" />
      <div class="flex:col min-w-0 text-sm">
        <div class="font-medium leading-tight truncate">{{ primaryMatch.name }}</div>
        <div class="text-xs text-muted-foreground leading-tight truncate">{{ primaryMatch.email }}</div>
      </div>
    </div>
    <p v-else-if="showNotRegisteredHint" class="text-xs text-muted-foreground px-0.5">
      This address is not associated with a registered user on the platform. You can still send an invite —
      they will join after signing up.
    </p>

    <div
      v-if="selectedInvites.length"
      class="flex:col gap-2 rounded-lg border bg-card p-2 max-h-56 overflow-y-auto"
    >
      <div
        v-for="(inv, idx) in selectedInvites"
        :key="idx"
        class="flex:row items-center gap-3 rounded-md p-1.5"
      >
        <UserAvatar
          v-if="inv.user"
          :name="inv.user.name"
          :picture="inv.user.picture"
          size="md"
          class="flex-shrink-0"
        />
        <div
          v-else
          class="h-10 w-10 flex-shrink-0 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-[10px]"
        >
          @
        </div>
        <div class="flex:col min-w-0 flex-1 text-sm">
          <template v-if="inv.user">
            <div class="font-medium leading-tight truncate">{{ inv.user.name }}</div>
            <div class="text-xs text-muted-foreground leading-tight truncate">{{ inv.email }}</div>
          </template>
          <template v-else>
            <div class="font-medium leading-tight truncate">{{ inv.email }}</div>
            <div class="text-xs text-muted-foreground">No account yet for this address</div>
          </template>
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          title="Remove"
          class="self-start"
          @click="removePending(inv.email)"
        >
          <X class="h-4 w-4" />
        </Button>
      </div>
    </div>

    <div class="flex justify-end pt-1 mt-auto">
      <Button type="button" size="sm" :disabled="selectedInvites.length === 0 || isSending" @click="onSend">
        {{ isSending ? "Sending…" : "Send invite" }}
      </Button>
    </div>
  </div>
</template>

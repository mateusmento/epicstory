<script lang="ts" setup>
import { useDependency } from "@/core/dependency-injection";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Menu,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuTrigger,
  ScrollArea,
} from "@/design-system";
import { useAuth } from "@/domain/auth";
import { useWorkspace } from "@/domain/workspace";
import { useConfirmDialog } from "@/presentationals/confirm-dialog";
import { UserAvatar } from "@/presentationals/user";
import { UserApi } from "@epicstory/api-client";
import type { IUser } from "@epicstory/contracts";
import { WorkspaceRole } from "@epicstory/contracts";
import { DotsHorizontalIcon } from "@radix-icons/vue";
import { format } from "date-fns";
import { debounce } from "lodash";
import { Crown, Loader2, Trash2Icon, UserPlus } from "lucide-vue-next";
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { toast } from "vue-sonner";

type PendingInvite = { email: string; user: IUser | null };

const {
  workspace,
  members,
  fetchWorkspaceMembers,
  sendWorkspaceMemberInvite,
  removeMember,
  transferOwnership,
  deleteWorkspace,
  memberRoleLabel,
} = useWorkspace();
const { user: authUser } = useAuth();
const userApi = useDependency(UserApi);
const router = useRouter();
const confirmDialog = useConfirmDialog();

const meMember = computed(() => members.value.find((m) => m.userId === authUser.value?.id));
const isOwner = computed(() => meMember.value?.role === WorkspaceRole.OWNER);
const membersLoading = ref(false);
const transferBusy = ref(false);

const deleteOpen = ref(false);
const deleteConfirmName = ref("");
const isDeletingWorkspace = ref(false);
const deleteError = ref("");
const nameMatches = computed(() => deleteConfirmName.value.trim() === (workspace.value?.name ?? ""));

const inviteOpen = ref(false);
const emailInput = ref("");
const searchHits = ref<IUser[]>([]);
const isSearching = ref(false);
const selectedInvites = ref<PendingInvite[]>([]);
const isSending = ref(false);

onMounted(async () => {
  membersLoading.value = true;
  try {
    await fetchWorkspaceMembers();
  } finally {
    membersLoading.value = false;
  }
});

watch(workspace, async () => {
  membersLoading.value = true;
  try {
    await fetchWorkspaceMembers();
  } finally {
    membersLoading.value = false;
  }
});

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

function openInvite() {
  inviteOpen.value = true;
  emailInput.value = "";
  searchHits.value = [];
  selectedInvites.value = [];
}

function closeInvite() {
  inviteOpen.value = false;
  emailInput.value = "";
  searchHits.value = [];
  selectedInvites.value = [];
}

function emailKey(e: KeyboardEvent) {
  if (e.key !== "Enter") return;
  e.preventDefault();
  const raw = emailInput.value.trim();
  if (!raw) return;
  const t = raw.toLowerCase();
  if (selectedInvites.value.some((i) => i.email.toLowerCase() === t)) return;
  if (authUser.value?.email?.toLowerCase() === t) return;
  if (members.value.some((m) => m.user.email?.toLowerCase() === t)) return;
  const fromHits = searchHits.value.find((u) => u.email.toLowerCase() === t) ?? null;
  selectedInvites.value = [...selectedInvites.value, { email: raw, user: fromHits }];
  emailInput.value = "";
  searchHits.value = [];
}

function removePending(email: string) {
  const e = email.toLowerCase();
  selectedInvites.value = selectedInvites.value.filter((i) => i.email.toLowerCase() !== e);
}

async function onSendInvites() {
  if (selectedInvites.value.length === 0 || isSending.value) return;
  isSending.value = true;
  try {
    await sendWorkspaceMemberInvite(
      selectedInvites.value.map((i) => ({
        email: i.email,
        userId: i.user?.id,
      })),
    );
    const n = selectedInvites.value.length;
    closeInvite();
    await fetchWorkspaceMembers();
    toast.success(n === 1 ? "Invite sent" : `${n} invites sent`);
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : "Could not send invites.");
  } finally {
    isSending.value = false;
  }
}

async function onTransferOwnership(userId: number, memberName: string) {
  const confirmed = await confirmDialog.open({
    title: "Transfer ownership?",
    description: `Make ${memberName} the owner of this workspace. You will become an admin.`,
    confirmLabel: "Transfer ownership",
    cancelLabel: "Cancel",
    destructive: true,
  });
  if (!confirmed || transferBusy.value) return;
  transferBusy.value = true;
  try {
    await transferOwnership(userId);
    toast.success("Ownership transferred");
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : "Could not transfer ownership.");
  } finally {
    transferBusy.value = false;
  }
}

async function onRemoveMember(memberId: number, memberName: string) {
  const confirmed = await confirmDialog.open({
    title: "Remove member?",
    description: `${memberName} will lose access to this workspace.`,
    confirmLabel: "Remove",
    cancelLabel: "Cancel",
    destructive: true,
  });
  if (!confirmed) return;
  try {
    await removeMember(memberId);
    toast.success("Member removed");
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : "Could not remove member.");
  }
}

async function onConfirmDeleteWorkspace() {
  if (!nameMatches.value || isDeletingWorkspace.value) return;
  deleteError.value = "";
  isDeletingWorkspace.value = true;
  try {
    await deleteWorkspace();
    deleteOpen.value = false;
    toast.message("Workspace is being deleted…");
    await router.push({ name: "select-workspace" });
  } catch (error: unknown) {
    const msg =
      error && typeof error === "object" && "response" in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
    deleteError.value = msg || "Could not delete workspace.";
  } finally {
    isDeletingWorkspace.value = false;
  }
}

function roleBadgeIntent(role: number) {
  if (role === WorkspaceRole.OWNER) return "primary" as const;
  if (role === WorkspaceRole.ADMIN) return "success" as const;
  return "secondary" as const;
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <ScrollArea class="min-h-0 flex-1">
      <div class="!block max-w-3xl p-6 pb-10">
        <h1 class="text-lg font-semibold tracking-tight">Workspace</h1>
        <p class="mt-1 max-w-xl text-sm text-secondary-foreground">
          Configure this workspace, invite teammates, and manage ownership.
        </p>

        <!-- General -->
        <section class="mt-6 rounded-lg border border-border bg-card shadow-sm">
          <div class="border-b border-border px-4 py-3">
            <h2 class="text-sm font-medium">General</h2>
            <p class="mt-1 text-xs text-secondary-foreground">
              Identity for this workspace across Epicstory.
            </p>
          </div>
          <div class="space-y-3 p-4">
            <div>
              <p class="text-xs text-secondary-foreground">Name</p>
              <p class="mt-1 text-sm font-medium">{{ workspace?.name ?? "—" }}</p>
            </div>
          </div>
        </section>

        <!-- Members -->
        <section class="mt-4 rounded-lg border border-border bg-card shadow-sm">
          <div
            class="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-sm font-medium">Members</h2>
                <span v-if="!membersLoading" class="text-xs text-secondary-foreground tabular-nums">
                  {{ members.length }}
                </span>
              </div>
              <p class="mt-1 text-xs text-secondary-foreground">
                People with access to projects, channels, and issues in this workspace.
              </p>
            </div>
            <Button variant="flat" size="sm" class="shrink-0" type="button" @click="openInvite">
              <UserPlus class="mr-1.5 size-3.5" />
              Invite
            </Button>
          </div>

          <div class="p-2 sm:p-3">
            <div
              v-if="membersLoading && members.length === 0"
              class="flex items-center justify-center gap-2 py-10 text-sm text-secondary-foreground"
            >
              <Loader2 class="size-4 animate-spin" />
              Loading members…
            </div>

            <ul v-else class="divide-y rounded-md border">
              <li
                v-for="member in members"
                :key="member.id"
                class="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40"
              >
                <UserAvatar
                  :name="member.user.name"
                  :picture="member.user.picture"
                  size="lg"
                  class="flex-shrink-0"
                />
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="truncate text-sm font-medium">{{ member.user.name }}</span>
                    <Badge size="xs" variant="soft" :intent="roleBadgeIntent(member.role)">
                      {{ memberRoleLabel(member.role) }}
                    </Badge>
                  </div>
                  <p class="truncate text-xs text-secondary-foreground">
                    {{ member.user.email }}
                    <span class="text-secondary-foreground/80">
                      · since {{ format(member.joinedAt, "MMM do, yyyy") }}
                    </span>
                  </p>
                </div>
                <Menu v-if="member.userId !== authUser?.id || member.role !== WorkspaceRole.OWNER">
                  <MenuTrigger as-child>
                    <Button variant="ghost" size="icon" type="button" aria-label="Member actions">
                      <DotsHorizontalIcon />
                    </Button>
                  </MenuTrigger>
                  <MenuContent side="bottom" align="end">
                    <MenuGroup>
                      <MenuItem
                        v-if="isOwner && member.role !== WorkspaceRole.OWNER"
                        :disabled="transferBusy"
                        @click="onTransferOwnership(member.userId, member.user.name)"
                      >
                        <Crown class="mr-2 h-4 w-4" />
                        <div>Transfer ownership</div>
                      </MenuItem>
                      <MenuItem
                        v-if="member.role !== WorkspaceRole.OWNER"
                        intent="destructive"
                        @click="onRemoveMember(member.id, member.user.name)"
                      >
                        <Trash2Icon class="mr-2 h-4 w-4" />
                        <div>Remove from workspace</div>
                      </MenuItem>
                    </MenuGroup>
                  </MenuContent>
                </Menu>
              </li>
            </ul>
          </div>
        </section>

        <!-- Danger zone -->
        <section v-if="isOwner" class="mt-4 rounded-lg border border-destructive/25 bg-card shadow-sm">
          <div class="border-b border-destructive/20 px-4 py-3">
            <h2 class="text-sm font-medium text-destructive">Danger zone</h2>
            <p class="mt-1 text-xs text-secondary-foreground">
              Permanently delete this workspace and all of its data. Deletion runs in the background.
            </p>
          </div>
          <div class="p-4">
            <Button
              type="button"
              variant="flat"
              intent="destructive"
              size="sm"
              @click="
                deleteConfirmName = '';
                deleteError = '';
                deleteOpen = true;
              "
            >
              Delete workspace
            </Button>
          </div>
        </section>
      </div>
    </ScrollArea>

    <!-- Invite dialog -->
    <Dialog :open="inviteOpen" @update:open="(v) => (!v ? closeInvite() : (inviteOpen = true))">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to workspace</DialogTitle>
        </DialogHeader>

        <div class="mt-2 flex flex-col gap-3">
          <div class="flex flex-col gap-1.5">
            <Label for="ws-invite-email">Email</Label>
            <Input
              id="ws-invite-email"
              v-model="emailInput"
              type="email"
              autocomplete="email"
              placeholder="name@example.com"
              @keydown="emailKey"
            />
            <p class="text-xs text-secondary-foreground">Press Enter to add to the invite list.</p>
          </div>

          <p v-if="isSearching" class="text-xs text-secondary-foreground">Searching…</p>

          <div v-else-if="primaryMatch" class="flex items-center gap-3 rounded-md border px-2 py-1.5">
            <UserAvatar
              :name="primaryMatch.name"
              :picture="primaryMatch.picture"
              size="base"
              class="flex-shrink-0"
            />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">{{ primaryMatch.name }}</p>
              <p class="truncate text-xs text-secondary-foreground">{{ primaryMatch.email }}</p>
            </div>
          </div>

          <p v-else-if="showNotRegisteredHint" class="text-xs text-secondary-foreground">
            This address is not associated with a registered user. You can still send an invite — they will
            join after signing up.
          </p>

          <div v-if="selectedInvites.length" class="max-h-48 divide-y overflow-y-auto rounded-md border">
            <div v-for="(inv, idx) in selectedInvites" :key="idx" class="flex items-center gap-3 px-2 py-1.5">
              <UserAvatar
                v-if="inv.user"
                :name="inv.user.name"
                :picture="inv.user.picture"
                size="base"
                class="flex-shrink-0"
              />
              <span
                v-else
                class="flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-muted text-sm"
              >
                @
              </span>
              <div class="min-w-0 flex-1">
                <template v-if="inv.user">
                  <p class="truncate text-sm font-medium">{{ inv.user.name }}</p>
                  <p class="truncate text-xs text-secondary-foreground">{{ inv.email }}</p>
                </template>
                <template v-else>
                  <p class="truncate text-sm font-medium">{{ inv.email }}</p>
                  <p class="text-xs text-secondary-foreground">No account yet</p>
                </template>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                title="Remove"
                @click="removePending(inv.email)"
              >
                <Trash2Icon class="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter class="mt-4">
          <Button type="button" variant="outline" :disabled="isSending" @click="closeInvite"> Cancel </Button>
          <Button type="button" :disabled="selectedInvites.length === 0 || isSending" @click="onSendInvites">
            <Loader2 v-if="isSending" class="mr-1.5 size-3.5 animate-spin" />
            {{ isSending ? "Sending…" : "Send invite" }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Delete dialog -->
    <Dialog :open="deleteOpen" @update:open="deleteOpen = $event">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete workspace</DialogTitle>
        </DialogHeader>
        <p class="text-sm text-secondary-foreground">
          This permanently deletes
          <span class="font-medium text-foreground">{{ workspace?.name }}</span>
          and all projects, issues, channels, and files. Type the workspace name to confirm.
        </p>
        <div class="mt-3 flex flex-col gap-1.5">
          <Label for="ws-delete-confirm">Workspace name</Label>
          <Input id="ws-delete-confirm" v-model="deleteConfirmName" autocomplete="off" />
        </div>
        <p v-if="deleteError" class="mt-2 text-sm text-destructive">{{ deleteError }}</p>
        <DialogFooter class="mt-2">
          <Button type="button" variant="outline" :disabled="isDeletingWorkspace" @click="deleteOpen = false">
            Cancel
          </Button>
          <Button
            type="button"
            variant="flat"
            intent="destructive"
            :disabled="!nameMatches || isDeletingWorkspace"
            @click="onConfirmDeleteWorkspace"
          >
            {{ isDeletingWorkspace ? "Deleting…" : "Delete workspace" }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

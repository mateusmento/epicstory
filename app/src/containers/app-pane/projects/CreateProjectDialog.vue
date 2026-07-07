<script setup lang="ts">
import { useWorkspace } from "@/domain/workspace";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system";
import { computed, ref, watch } from "vue";

const open = defineModel<boolean>("open", { default: false });

const emit = defineEmits<{
  submit: [payload: { name: string; issueKeyPrefix?: string; teamId: number }];
}>();

const name = ref("");
const issueKeyPrefix = ref("");
const issueKeyPrefixTouched = ref(false);
const teamId = ref<string>("");
const submitting = ref(false);
const suggestingPrefix = ref(false);

const { suggestProjectKeyPrefix, teams, fetchTeams } = useWorkspace();

let nameDebounceTimer: ReturnType<typeof setTimeout> | undefined;
let lastSuggestRequestId = 0;

const issueKeyPreview = computed(() => {
  const prefix = issueKeyPrefix.value.trim();
  return prefix.length > 0 ? `${prefix}-1` : "—";
});

async function suggestFromNameDebounced(projectName: string) {
  if (nameDebounceTimer) clearTimeout(nameDebounceTimer);

  const trimmed = projectName.trim();
  if (!trimmed) {
    suggestingPrefix.value = false;
    issueKeyPrefix.value = "";
    return;
  }

  const reqId = ++lastSuggestRequestId;
  suggestingPrefix.value = true;

  nameDebounceTimer = setTimeout(async () => {
    try {
      const suggested = await suggestProjectKeyPrefix(trimmed);
      if (reqId !== lastSuggestRequestId) return;
      if (!issueKeyPrefixTouched.value) {
        issueKeyPrefix.value = suggested;
      }
    } finally {
      if (reqId === lastSuggestRequestId) {
        suggestingPrefix.value = false;
      }
    }
  }, 250);
}

function onNameInput(value: string | undefined) {
  const next = value ?? "";
  name.value = next;
  if (!issueKeyPrefixTouched.value) {
    suggestFromNameDebounced(next);
  }
}

function onIssueKeyInput(value: string | undefined) {
  issueKeyPrefixTouched.value = true;
  issueKeyPrefix.value = (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function resetForm() {
  name.value = "";
  issueKeyPrefix.value = "";
  issueKeyPrefixTouched.value = false;
  teamId.value = "";
  submitting.value = false;
  suggestingPrefix.value = false;
  lastSuggestRequestId += 1;
  if (nameDebounceTimer) clearTimeout(nameDebounceTimer);
}

watch(open, async (isOpen) => {
  if (isOpen) {
    resetForm();
    await fetchTeams();
    if (teams.value.length > 0 && !teamId.value) {
      teamId.value = String(teams.value[0].id);
    }
  }
});

function close() {
  open.value = false;
}

async function handleSubmit() {
  const trimmedName = name.value.trim();
  const selectedTeamId = teamId.value ? +teamId.value : undefined;
  if (!trimmedName || !selectedTeamId || submitting.value) return;

  submitting.value = true;
  try {
    const prefix = issueKeyPrefix.value.trim();
    emit("submit", {
      name: trimmedName,
      issueKeyPrefix: prefix.length > 0 ? prefix : undefined,
      teamId: selectedTeamId,
    });
    close();
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(value) => (open = value)">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>Create project</DialogTitle>
      </DialogHeader>

      <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
        <div class="flex flex-col gap-2">
          <Label for="create-project-name">Name</Label>
          <Input
            id="create-project-name"
            :model-value="name"
            autocomplete="off"
            placeholder="Project name"
            @update:model-value="onNameInput"
          />
        </div>

        <div class="flex flex-col gap-2">
          <Label for="create-project-key">Project key</Label>
          <Input
            id="create-project-key"
            :model-value="issueKeyPrefix"
            autocomplete="off"
            placeholder="Suggested from name"
            @update:model-value="onIssueKeyInput"
          />
          <p class="text-xs text-muted-foreground">
            Issues are labeled PREFIX-123. This field follows the name until you edit it (preview:
            {{ issueKeyPreview }}{{ suggestingPrefix ? ", checking…" : "" }}).
          </p>
        </div>

        <div class="flex flex-col gap-2">
          <Label for="create-project-team">Team</Label>
          <Select v-model="teamId" :disabled="teams.length === 0">
            <SelectTrigger id="create-project-team">
              <SelectValue placeholder="Select team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="team in teams" :key="team.id" :value="String(team.id)">
                {{ team.name }}
              </SelectItem>
            </SelectContent>
          </Select>
          <p class="text-xs text-muted-foreground">Every project belongs to a team for sprint planning.</p>
        </div>

        <DialogFooter class="gap-2 sm:gap-0">
          <Button type="button" variant="outline" :disabled="submitting" @click="close"> Cancel </Button>
          <Button type="submit" :disabled="submitting || !name.trim() || !teamId">Create</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>

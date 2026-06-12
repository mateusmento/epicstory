import { Button } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { defineComponent } from "vue";

/** Stand-in for containers/meeting/MeetingDeviceMenu slot content in MeetingControls stories. */
export const DeviceMenuStub = defineComponent({
  name: "DeviceMenuStub",
  setup() {
    return () => (
      <Button variant="ghost" size="icon" title="Devices">
        <Icon name="md-settings-round" class="h-4 w-4" />
      </Button>
    );
  },
});

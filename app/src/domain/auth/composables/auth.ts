import { useDependency } from "@/core/dependency-injection";
import { AuthService } from "../auth.service";
import { useRouter } from "vue-router";
import { useWorkspace } from "@/domain/workspace";

export function useAuth() {
  const authApi = useDependency(AuthService);
  const { workspace } = useWorkspace();

  const router = useRouter();

  async function signOut() {
    await authApi.signout();
    router.push("/signin");
    workspace.value = null;
  }

  return { signOut };
}

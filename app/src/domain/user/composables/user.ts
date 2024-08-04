import { useDependency } from "@/core/dependency-injection";
import { useAuth } from "@/domain/auth";
import { UserApi } from "../api";

export function useUser() {
  const { user } = useAuth();

  const userApi = useDependency(UserApi);

  async function updateUserPicture(data: { picture: string }) {
    user.value = await userApi.updatePicture(data);
  }

  return {
    user,
    updateUserPicture,
  };
}

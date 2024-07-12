import { type DependencyContainer, type InjectionToken } from "tsyringe";
import { inject, type App, type Plugin } from "vue";

const DI_CONTAINER_TOKEN = "dependencies";

export function createDependenciesPlugin(container: DependencyContainer) {
  return {
    install(app: App) {
      app.provide(DI_CONTAINER_TOKEN, container);
    },
  } as Plugin;
}

export function useDependency<T>(token: InjectionToken<T>) {
  const container = inject<DependencyContainer>(DI_CONTAINER_TOKEN);
  if (!container) throw new Error("Dependency container not provided");
  return container.resolve(token);
}

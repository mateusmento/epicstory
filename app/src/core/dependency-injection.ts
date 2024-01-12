import {
  container as globalContainer,
  type DependencyContainer,
  type InjectionToken,
} from 'tsyringe';
import { inject, provide } from 'vue';
import { createAxios } from './axios';
import { InboxApi } from '@/domain/inbox/inbox.api';

const DI_CONTAINER_TOKEN = 'dependencyContainer';

export function provideDependencyInjection() {
  const container = globalContainer.createChildContainer();
  provide(DI_CONTAINER_TOKEN, container);
  container.registerInstance('axios', createAxios());
  container.register('InboxApi', InboxApi);
  return container;
}

export function useDependencyContainer() {
  const container = inject<DependencyContainer>(DI_CONTAINER_TOKEN);
  if (!container) throw new Error('DI container not provided');
  return container;
}

export function useInjectable<T>(token: InjectionToken<T>): T {
  const container = useDependencyContainer();
  return container.resolve(token);
}

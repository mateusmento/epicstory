import { inject, injectable } from 'tsyringe';
import type { Axios } from 'axios';
import type { IInbox } from './inbox.type';

@injectable()
export class InboxApi {
  constructor(@inject('axios') private axios: Axios) {}

  fetchInbox() {
    return this.axios.get<IInbox>('/inbox').then((res) => res.data);
  }
}

import { Injectable } from '@nestjs/common';
import { LinearClient } from '@linear/sdk';

@Injectable()
export class LinearClientService {
  create(accessToken: string) {
    return new LinearClient({ accessToken });
  }
}

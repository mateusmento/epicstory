import { IsNumber } from 'class-validator';
import { patch } from 'src/core/objects';

export class IssueDueDatePayload {
  @IsNumber()
  userId: number;

  @IsNumber()
  issueId: number;

  constructor(data: Partial<IssueDueDatePayload> = {}) {
    patch(this, data);
  }
}
